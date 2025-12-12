import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AttemptsService, Attempt } from '../services/attempts.service';
import { UsersService } from '../services/users.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-attempts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './attempts.component.html',
  styleUrls: ['./attempts.component.css']
})
export class AttemptsComponent implements OnInit, OnDestroy {
  attempts: Attempt[] = [];
  loading = true;
  private sub!: Subscription;

  constructor(
    private attemptsService: AttemptsService,
    private usersService: UsersService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.attemptsService.attempts$.subscribe(attempts => {
      this.attempts = attempts;
      this.loading = false;
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.reloadAttempts());

    this.reloadAttempts();
  }

  private reloadAttempts(): void {
    const user = this.usersService.getCurrentUser();
    if (user?.id) {
      this.loading = true;
      this.attemptsService.loadAttempts(user.id);
    } else {
      this.attempts = [];
      this.loading = false;
    }
  }

  async deleteAttempt(attemptId: string) {
    if (confirm('Delete this quiz attempt permanently?\n\nThis cannot be undone.')) {
      try {
        await this.attemptsService.deleteAttempt(attemptId);
      } catch (err) {
        alert('Failed to delete attempt. Check console.');
        console.error(err);
      }
    }
  }

  trackById(index: number, attempt: Attempt): string {
    return attempt._id || index.toString();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}