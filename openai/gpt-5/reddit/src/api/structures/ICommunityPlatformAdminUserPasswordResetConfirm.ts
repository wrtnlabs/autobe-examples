export namespace ICommunityPlatformAdminUserPasswordResetConfirm {
  /** Administrator password reset confirmation payload. */
  export type ICreate = {
    /** One-time reset token. */
    reset_token: string;

    /** New password to set. */
    new_password: string;
  };
}
