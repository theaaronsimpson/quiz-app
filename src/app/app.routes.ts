import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { UsersComponent } from './users.component/users.component';
import { AttemptsComponent } from './attempts/attempts.component';
import { QuizEditorComponent } from './quiz-editor/quiz-editor.component'; 
import { QuizPlayerComponent } from './quiz-player/quiz-player.component';

export const routes: Routes = [
  { path: '',            component: HomeComponent },
  { path: 'quizzes',     component: HomeComponent },
  { path: 'quiz/new',    component: QuizEditorComponent },     
  { path: 'quiz/:id/edit', component: QuizEditorComponent },  
  { path: 'play/:id', component: QuizPlayerComponent },
  { path: 'attempts',    component: AttemptsComponent },
  { path: 'users',       component: UsersComponent },
  { path: '**',          redirectTo: '', pathMatch: 'full' }
];