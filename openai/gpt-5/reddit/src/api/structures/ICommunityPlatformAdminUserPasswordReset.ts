export namespace ICommunityPlatformAdminUserPasswordReset {
  /** Status summary for admin password reset lifecycle. */
  export type ISummary = {
    /**
     * Outcome summary of password reset (e.g., reset_sent,
     * reset_confirmed).
     */
    status: string;
  };
}
