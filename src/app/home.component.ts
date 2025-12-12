import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsersService } from './services/users.service';
import { QuizzesService } from './services/quizzes.service';
import { AttemptsService, Attempt as BackendAttempt } from './services/attempts.service'; // ← ADD THIS LINE

type Choice = { text: string };
type Question = { prompt: string; choices: Choice[]; correctIndex: number; points?: number };
type Quiz = { id: string; title: string; description?: string; published?: boolean; questions: Question[] };

type AttemptAnswer = { questionId?: string | null; selectedIndex: number };
type Attempt = {
  id: string;
  userId?: string;
  quizId: string;
  quizTitle?: string;
  startedAt: string;
  completedAt: string;
  questions?: Question[];
  answers: AttemptAnswer[];
  score?: number;
  maxScore?: number;
  percentage?: number;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private quizzesService = inject(QuizzesService);
  private attemptsService = inject(AttemptsService);

  quizzes = signal<Quiz[]>([]);
  attempts = signal<Attempt[]>([]);

  searchForm = this.fb.group({
    q: [''],
  });

  filteredAttempts = computed(() => {
    const currentUser = this.usersService.getCurrentUser();
    return this.attempts().filter(a => !currentUser || !a.userId || a.userId === currentUser.id);
  });

  totalQuizzes = computed(() => this.quizzes().length);
  totalAttempts = computed(() => this.filteredAttempts().length);

  averageScore = computed(() => {
    const rows = this.withComputedScores(this.filteredAttempts());
    if (!rows.length) return null;
    const avg = rows.reduce((acc, a) => acc + (a.percentage ?? 0), 0) / rows.length;
    return Math.round(avg * 100) / 100;
  });

  publishedQuizzes = computed(() => this.quizzes().filter(q => !!q.published));
  draftQuizzes = computed(() => this.quizzes().filter(q => !q.published));

  filteredQuizzes = computed(() => {
    const term = (this.searchForm.controls.q.value ?? '').trim().toLowerCase();
    const list = this.quizzes();
    if (!term) return list;
    return list.filter(q =>
      (q.title ?? '').toLowerCase().includes(term) ||
      (q.description ?? '').toLowerCase().includes(term)
    );
  });

  recentAttempts = computed(() =>
    this.withComputedScores(this.filteredAttempts())
      .slice()
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
      .slice(0, 5)
  );

  ngOnInit(): void {
    this.loadQuizzes();
    this.loadAttempts();

    this.usersService.currentUser$.subscribe(() => {
      this.loadAttempts();
    });
  }

  private loadQuizzes() {
    this.quizzes.set(this.quizzesService.getAll());
  }

  private loadAttempts() {
    const user = this.usersService.getCurrentUser();
    if (user?.id) {
      this.attemptsService.loadAttempts(user.id).then(() => {
        this.attemptsService.attempts$.subscribe((backendAttempts: BackendAttempt[]) => {
          const mapped: Attempt[] = backendAttempts.map(a => ({
            id: a._id || '',
            userId: a.userId,
            quizId: a.quizId,
            quizTitle: a.quizTitle,
            startedAt: a.date,
            completedAt: a.date,
            score: a.score,
            maxScore: a.totalPoints,
            percentage: a.percentage,
            answers: [],
            questions: []
          }));
          this.attempts.set(this.withComputedScores(mapped));
        });
      });
    } else {
      this.attempts.set([]);
    }
  }

  private withComputedScores(rows: Attempt[]): Attempt[] {
    return rows.map(a => {
     
      if (a.percentage !== undefined) {
        return a;
      }
      if (typeof a.score === 'number' && typeof a.maxScore === 'number' && a.maxScore > 0) {
        const pct = Math.round((a.score / a.maxScore) * 10000) / 100;
        return { ...a, percentage: pct };
      }
      return { ...a, percentage: 0 };
    });
  }

  trackByQuiz = (i: number, q: Quiz) => q?.id ?? i;

  attemptsFor(quizId: string): Attempt[] {
    const currentUser = this.usersService.getCurrentUser();
    return this.attempts().filter(a => a.quizId === quizId && (!currentUser || a.userId === currentUser.id));
  }

  bestPctFor(quizId: string): number | null {
    const list = this.attemptsFor(quizId);
    if (!list.length) return null;
    return Math.max(...list.map(a => a.percentage ?? 0));
  }

  fmtPct(n: number | null) {
    return n === null ? '—' : `${n.toFixed(2)}%`;
  }

  fmtDate(iso?: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(+d) ? '—' : d.toLocaleString();
  }
}