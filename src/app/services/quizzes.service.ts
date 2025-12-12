import { Injectable } from '@angular/core';

export type Choice = { text: string };

export type Question = {
  prompt: string;
  choices: Choice[];
  correctIndex: number;
  points?: number;
};

export type Quiz = {
  id: string;
  title: string;
  description?: string;
  published?: boolean;
  questions: Question[];
};

@Injectable({
  providedIn: 'root'
})
export class QuizzesService {
  private readonly KEY = 'quizzes';

  
  private saveAll(quizzes: Quiz[]) {
    localStorage.setItem(this.KEY, JSON.stringify(quizzes));
   
    window.dispatchEvent(new Event('storage'));
  }

  getAll(): Quiz[] {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  getById(id: string): Quiz | undefined {
    return this.getAll().find(q => q.id === id);
  }

  create(quiz: Omit<Quiz, 'id'>): Quiz {
    const all = this.getAll();
    const newQuiz = { ...quiz, id: crypto.randomUUID() };
    all.push(newQuiz);
    this.saveAll(all);         
    return newQuiz;
  }

  update(quiz: Quiz) {
    const all = this.getAll();
    const index = all.findIndex(q => q.id === quiz.id);
    if (index !== -1) {
      all[index] = quiz;
      this.saveAll(all);       
    }
  }

  delete(id: string) {
    const all = this.getAll().filter(q => q.id !== id);
    this.saveAll(all);          
  }
}