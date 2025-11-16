export namespace IDiscussionBoardAdminUserRefresh {
  /**
   * Request payload for refreshing JWT tokens for an already authenticated
   * discussion board administrator (adminUser).
   *
   * This DTO carries the refresh token previously issued during login or a
   * prior refresh operation. The backend validates this token against token
   * storage or embedded claims that reference
   * `discussion_board_adminusers.id`, checks account lifecycle fields (such
   * as `account_status`, `deleted_at`, and `email_verified`), and confirms
   * that an associated `discussion_board_adminuser_sessions` record is still
   * active.
   *
   * No credentials or profile fields are included here; this operation is
   * strictly for renewing tokens for an existing admin session.
   */
  export type IRequest = {
    /**
     * Opaque refresh token string issued to the adminUser during login or
     * an earlier refresh operation. It is used to request a new pair of JWT
     * tokens without resubmitting credentials.
     */
    refreshToken: string;
  };
}
