export namespace ICommunityPlatformAdminUserPasswordChange {
  /** Authenticated administrator password change payload. */
  export type IUpdate = {
    /** Current credential for verification. */
    current_password: string;

    /** New credential to set. */
    new_password: string;
  };

  /** Password change result summary for administrators. */
  export type ISummary = {
    /** Outcome summary (e.g., updated, sessions_rotated). */
    status: string;
  };
}
