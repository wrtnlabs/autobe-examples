export namespace ITodoListAuth {
  /**
   * Confirmation message that guest session has been successfully terminated.
   *
   * This schema represents the response from a guest logout operation that
   * terminates an unauthenticated guest user session. Unlike authenticated
   * user logout which revokes JWT tokens in the todo_list_token_blacklist
   * table, guest logout performs lightweight session cleanup appropriate for
   * transient, unauthenticated users.
   *
   * Guest users have limited functionality and no persistent account in the
   * todo_list_users table. Their sessions are temporary and can be safely
   * terminated without complex revocation procedures. This response confirms
   * the guest session has been cleared and any guest-specific session
   * identifiers or local state should be considered invalid.
   */
  export type IGuestLogoutResponse = {
    /**
     * Indicates whether the guest session was successfully terminated. True
     * means the guest logout operation completed successfully and the guest
     * session is now invalid. False indicates the logout operation failed
     * and the guest session may still be active.
     */
    success: boolean;

    /**
     * A human-readable confirmation message explaining the result of the
     * guest logout operation. Example messages: 'Guest session successfully
     * terminated' or 'Thank you for using the application'.
     */
    message: string;
  };
}
