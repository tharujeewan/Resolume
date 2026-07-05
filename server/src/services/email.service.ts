import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // If SMTP details are not configured, we'll log to standard stream/console
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      auth: config.email.smtp.auth.user ? config.email.smtp.auth : undefined,
      jsonTransport: !config.email.smtp.auth.user, // Fallback to json output in dev if no credentials
    } as any);
  }

  async sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        text,
        html,
      });

      if (!config.email.smtp.auth.user) {
        logger.info(`Email sent (Mock/Dev Transport): To: ${to} | Subject: ${subject}`);
        // Log the message contents to console in dev mode
        logger.debug(`Email body JSON: ${JSON.stringify(info.message)}`);
      } else {
        logger.info(`Email sent: To: ${to} | MessageId: ${info.messageId}`);
      }
    } catch (error: any) {
      logger.error(`Error sending email to ${to}: ${error.message}`);
      // Don't crash the server if email fails - log it and continue
    }
  }

  async sendVerificationEmail(to: string, token: string, origin: string): Promise<void> {
    const url = `${origin}/verify-email?token=${token}`;
    const subject = 'Verify your EventWall Account';
    const text = `Welcome to EventWall! Please verify your email by clicking: ${url}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Welcome to EventWall</h2>
        <p>Thank you for signing up! Please verify your email address to unlock your organizer dashboard.</p>
        <div style="margin: 24px 0;">
          <a href="${url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this link in your browser:</p>
        <p style="color: #4f46e5; font-size: 14px; word-break: break-all;">${url}</p>
      </div>
    `;
    await this.sendEmail(to, subject, text, html);
  }

  async sendPasswordResetEmail(to: string, token: string, origin: string): Promise<void> {
    const url = `${origin}/reset-password?token=${token}`;
    const subject = 'Reset your EventWall Password';
    const text = `You requested a password reset. Click this link to reset it: ${url}. If you did not request this, please ignore this email.`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Reset Your Password</h2>
        <p>You requested a link to reset your password. This link is valid for 1 hour.</p>
        <div style="margin: 24px 0;">
          <a href="${url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this link in your browser:</p>
        <p style="color: #4f46e5; font-size: 14px; word-break: break-all;">${url}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `;
    await this.sendEmail(to, subject, text, html);
  }
}

export const emailService = new EmailService();
export default emailService;
