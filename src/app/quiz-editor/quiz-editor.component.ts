import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { QuizzesService, Quiz, Question } from '../services/quizzes.service';
import { OpenTdbService } from '../services/open-tdb.service';

@Component({
  selector: 'app-quiz-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './quiz-editor.component.html',
  styleUrls: ['./quiz-editor.component.css']
})
export class QuizEditorComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private quizzesService = inject(QuizzesService);
  private openTdbService = inject(OpenTdbService);

  quizForm: FormGroup;
  isNew = true;
  quizId = '';

  // OpenTDB Import Modal State
  showImportModal = false;
  importing = false;
  categories: { id: number; name: string }[] = [];

  importConfig = {
    amount: 10,
    category: null as number | null,
    difficulty: null as 'easy' | 'medium' | 'hard' | null,
    type: null as 'multiple' | 'boolean' | null
  };

  constructor() {
    this.quizForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      published: [false],
      questions: this.fb.array([])
    });

    this.loadCategories();
  }

  get questions(): FormArray {
    return this.quizForm.get('questions') as FormArray;
  }

  getChoices(qIndex: number): FormArray {
    return this.questions.at(qIndex).get('choices') as FormArray;
  }

  ngOnInit() {
    const url = this.route.snapshot.url;
    if (url.length === 2 && url[1].path === 'new') {
      this.isNew = true;
      this.addQuestion();
    } else if (url.length === 3 && url[2].path === 'edit') {
      this.isNew = false;
      this.quizId = url[1].path;
      const quiz = this.quizzesService.getById(this.quizId);
      if (!quiz) {
        this.router.navigate(['/']);
        return;
      }

      this.quizForm.patchValue({
        title: quiz.title,
        description: quiz.description || '',
        published: !!quiz.published
      });

      this.questions.clear();
      quiz.questions.forEach(q => this.addQuestion(q));
    }
  }

  // === OpenTDB Category Loading ===
  private loadCategories() {
    this.openTdbService.getCategories().subscribe({
      next: (cats) => this.categories = cats,
      error: () => console.warn('Could not load OpenTDB categories')
    });
  }

  // === Import Modal Controls ===
  openImportModal() {
    console.log('Import modal clicked!');
    this.showImportModal = true;
  }

  importQuestions() {
    if (!this.importConfig.amount || this.importConfig.amount < 1 || this.importConfig.amount > 50) {
      alert('Please enter a number between 1 and 50');
      return;
    }

    this.importing = true;

    this.openTdbService.getQuestions({
      amount: this.importConfig.amount,
      category: this.importConfig.category ?? undefined,
      difficulty: this.importConfig.difficulty ?? undefined,
      type: this.importConfig.type ?? undefined
    }).subscribe({
      next: (questions) => {
        if (this.questions.length > 0) {
          if (!confirm(`This will add ${questions.length} new questions. Continue?`)) {
            this.importing = false;
            return;
          }
        }

        questions.forEach(q => {
          const allChoices = [...q.incorrect_answers];
          const correctIdx = Math.floor(Math.random() * (allChoices.length + 1));
          allChoices.splice(correctIdx, 0, q.correct_answer);

          const points = q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 2 : 3;

          const questionData: Question = {
            prompt: q.question,
            choices: allChoices.map(text => ({ text })),
            correctIndex: correctIdx,
            points
          };

          this.addQuestion(questionData);
        });

        this.showImportModal = false;
        this.importing = false;
        alert(`Successfully imported ${questions.length} questions!`);
      },
      error: (err) => {
        console.error('OpenTDB import error:', err);
        alert('Failed to import questions. Check console or try again later.');
        this.importing = false;
      }
    });
  }

  // === Question & Choice Helpers ===
  createChoice(text = '') {
    return this.fb.group({
      text: [text, Validators.required]
    });
  }

  createQuestion(q?: Question): FormGroup {
    return this.fb.group({
      prompt: [q?.prompt || '', Validators.required],
      points: [q?.points ?? 1, [Validators.required, Validators.min(1)]],
      choices: this.fb.array(
        (q?.choices.length ? q.choices : [{ text: '' }, { text: '' }])
          .map(c => this.createChoice(c.text))
      ),
      correctIndex: [q?.correctIndex ?? 0, Validators.required]
    });
  }

  addQuestion(q?: Question) {
    this.questions.push(this.createQuestion(q));
  }

  removeQuestion(index: number) {
    if (this.questions.length <= 1) {
      alert("You must have at least one question.");
      return;
    }
    this.questions.removeAt(index);
  }

  addChoice(qIndex: number) {
    this.getChoices(qIndex).push(this.createChoice());
  }

  removeChoice(qIndex: number, cIndex: number) {
    const choices = this.getChoices(qIndex);
    if (choices.length <= 2) return;
    choices.removeAt(cIndex);

    const correctCtrl = this.questions.at(qIndex).get('correctIndex');
    if (correctCtrl && correctCtrl.value >= choices.length) {
      correctCtrl.setValue(0);
    }
  }

  // === Save / Publish / Delete ===
  save(publish = false) {
    if (this.quizForm.invalid) {
      alert('Please fix all errors');
      return;
    }

    const value = this.quizForm.getRawValue();

    const questions: Question[] = value.questions
      .map((q: any) => ({
        prompt: q.prompt.trim(),
        points: Number(q.points),
        choices: q.choices
          .map((c: any) => ({ text: c.text.trim() }))
          .filter((c: any) => c.text),
        correctIndex: Number(q.correctIndex)
      }))
      .filter((q: Question) => q.prompt && q.choices.length >= 2);

    if (questions.length === 0) {
      alert('At least one complete question required');
      return;
    }

    const quizData: any = {
      title: value.title.trim(),
      description: value.description?.trim(),
      published: publish,
      questions
    };

    if (this.isNew) {
      this.quizzesService.create(quizData as Omit<Quiz, 'id'>);
    } else {
      this.quizzesService.update({ ...quizData, id: this.quizId } as Quiz);
    }

    this.router.navigate(['/']).then(() => window.location.reload());
  }

  deleteQuiz() {
    if (confirm('Delete this quiz forever?')) {
      this.quizzesService.delete(this.quizId);
      this.router.navigate(['/']);
    }
  }
}