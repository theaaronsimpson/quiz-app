import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QuizzesService, Quiz, Question } from '../services/quizzes.service';
import { UsersService } from '../services/users.service';
import { AttemptsService } from '../services/attempts.service';

@Component({
  selector: 'app-quiz-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-player.component.html',
  styleUrls: ['./quiz-player.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class QuizPlayerComponent implements OnInit {
  quiz: Quiz | null = null;
  quizId!: string;

  currentQuestionIndex = 0;
  selectedChoice: number | null = null;
  answers: (number | null)[] = [];
  showResults = false;
  quizFinished = false;

  score = 0;
  totalPoints = 0;
  percentage = 0;
  startTime = Date.now();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizzesService: QuizzesService,
    private usersService: UsersService,       
    private attemptsService: AttemptsService   
  ) {}

  ngOnInit(): void {
    this.quizId = this.route.snapshot.paramMap.get('id') ?? '';
    const quiz = this.quizzesService.getById(this.quizId);

    if (!quiz || !quiz.published) {
      this.router.navigate(['/']);
      return;
    }

    this.quiz = quiz;
    this.answers = new Array(quiz.questions.length).fill(null);
    this.totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
  }

  get currentQuestion(): Question | undefined {
    return this.quiz?.questions[this.currentQuestionIndex];
  }

  get progress(): number {
    if (!this.quiz || this.quiz.questions.length === 0) return 0;
    return ((this.currentQuestionIndex + 1) / this.quiz.questions.length) * 100;
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === (this.quiz?.questions.length ?? 0) - 1;
  }

  selectChoice(choiceIndex: number): void {
    if (this.showResults) return;
    this.selectedChoice = choiceIndex;
    this.answers[this.currentQuestionIndex] = choiceIndex;
  }

  nextQuestion(): void {
    if (this.isLastQuestion) {
      this.finishQuiz();
    } else {
      this.currentQuestionIndex++;
      this.selectedChoice = this.answers[this.currentQuestionIndex];
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.selectedChoice = this.answers[this.currentQuestionIndex];
    }
  }

  async finishQuiz(): Promise<void> {
    if (!this.quiz) return;

    this.showResults = true;
    this.quizFinished = true;

    // Calculate score
    this.score = 0;
    this.quiz.questions.forEach((q, i) => {
      if (this.answers[i] === q.correctIndex) {
        this.score += q.points ?? 1;
      }
    });

    this.percentage = this.totalPoints > 0
      ? Math.round((this.score / this.totalPoints) * 100)
      : 0;

    const currentUser = this.usersService.getCurrentUser();

const attemptData = {
  userId: currentUser!.id,
  quizId: this.quiz!.id,
  quizTitle: this.quiz!.title,
  score: Number(this.score),  
  totalPoints: Number(this.totalPoints),
  percentage: Number(this.percentage), 
  timeTaken: Math.floor((Date.now() - this.startTime) / 1000)
};

    try {
      await this.attemptsService.saveAttempt(attemptData);
    } catch (err) {
      console.error('Failed to save attempt:', err);
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}