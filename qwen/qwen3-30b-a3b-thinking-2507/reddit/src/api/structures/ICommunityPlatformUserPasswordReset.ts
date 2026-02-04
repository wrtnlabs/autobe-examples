export namespace ICommunityPlatformUserPasswordReset {
  /**
   * Search parameters for password reset tokens including token value, user ID, and expiration status filters. Used in the /communityPlatform/user/password-resets endpoint for searching valid tokens and administrative token management. Supports standard pagination for large result sets.
   */
  export type IRequest = {};

  /**
   * Minimal summary of password reset requests for administrators, including computed token value, expiration date, creation timestamp, and associate user profile. Designed to exclude all security-sensitive data and present only essential information for administrative management.
   */
  export type ISummary = {};

  /**
   * Password reset token validation result that indicates whether the token is still usable and when it expires, without exposing the token value itself. Used in password reset workflows to prevent expired token usage.
   */
  export type IValidation = {};
}
