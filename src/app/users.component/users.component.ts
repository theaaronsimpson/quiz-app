import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsersService, User } from '../services/users.service';
import { AttemptsService, Attempt } from '../services/attempts.service';
import { QuizzesService } from '../services/quizzes.service';

interface Stats {
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  perfectScores: number;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  newUser = { username: '', email: '', password: '' };
  loginUser = { email: '', password: '' };
  editing: any = null;
  message = '';
  profile: User | null = null;


  attempts: Attempt[] = [];
  stats: Stats = { totalAttempts: 0, averageScore: 0, highestScore: 0, perfectScores: 0 };

  constructor(
    private usersService: UsersService,
    private attemptsService: AttemptsService,
    private quizzesService: QuizzesService
  ) {
    this.profile = this.usersService.getCurrentUser();
  }

ngOnInit(): void {
  this.usersService.currentUser$.subscribe(user => {
    this.profile = user;
    if (user) {
      this.loadStats();
    } else {
      this.attempts = [];
      this.stats = { totalAttempts: 0, averageScore: 0, highestScore: 0, perfectScores: 0 };
    }
  });
}

private loadStats(): void {
  const userId = this.profile?.id;
  if (!userId) return;

  this.attemptsService.loadAttempts(userId).then(() => {
    this.attemptsService.attempts$.subscribe(attempts => {
      this.attempts = attempts;
      const percentages = attempts.map(a => a.percentage || 0).filter(p => p > 0);

      if (percentages.length > 0) {
        this.stats = {
          totalAttempts: percentages.length,
          averageScore: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
          highestScore: Math.max(...percentages),
          perfectScores: percentages.filter(p => p === 100).length
        };
      } else {
        this.stats = { totalAttempts: 0, averageScore: 0, highestScore: 0, perfectScores: 0 };
      }
    });
  });
}

  getRank(): string {
    const avg = this.stats.averageScore;
    if (avg >= 95) return 'Quiz God';
    if (avg >= 85) return 'Master';
    if (avg >= 70) return 'Expert';
    if (avg >= 50) return 'Skilled';
    return 'Learner';
  }

register() {
  this.usersService.register({
    username: this.newUser.username,
    email: this.newUser.email,
    password: this.newUser.password
  }).subscribe({
    next: () => {
      this.message = 'Registered and logged in!';
      this.newUser = { username: '', email: '', password: '' };
    },
    error: (err) => this.message = err.error?.message || 'Registration failed'
  });
}

login() {
  this.usersService.login(this.loginUser.email, this.loginUser.password).subscribe({
    next: () => {
      this.profile = this.usersService.getCurrentUser();
      this.message = 'Logged in successfully!';
      this.loginUser = { email: '', password: '' };
      this.loadStats();
    },
    error: (err) => this.message = err.error?.message || 'Invalid email or password'
  });
}

  startEdit() { this.editing = { ...this.profile }; }
  cancelEdit() { this.editing = null; }

saveEdit() {
  if (!this.editing?.username || !this.editing?.email) {
    this.message = 'Username and email are required';
    return;
  }

  this.usersService.update(this.editing).subscribe({
    next: (updatedUser) => {
      this.profile = updatedUser;
      this.editing = null;
      this.message = 'Profile updated successfully!';
    },
    error: (err) => {
      this.message = err.error?.message || 'Failed to update profile';
    }
  });
}

deleteAccount() {
  if (confirm('DELETE YOUR ACCOUNT FOREVER?\n\nThis cannot be undone. All data will be lost.')) {
    this.usersService.delete(this.profile!.id).subscribe({
      next: () => {
        this.profile = null;
        this.message = 'Account deleted permanently. Goodbye!';
        this.attempts = [];
        this.stats = { totalAttempts: 0, averageScore: 0, highestScore: 0, perfectScores: 0 };
        this.usersService.logout();
      },
      error: (err) => {
        this.message = 'Delete failed: ' + (err.error?.message || 'Server error');
      }
    });
  }
}


logout() {
  this.usersService.logout();
  this.profile = null;
  this.message = 'Logged out';
}
}