export namespace IPoliticsBbsUser {
  /**
   * Request body for refreshing authentication tokens on the politicsBbs
   * discussion board system. This DTO enables visitor sessions and member
   * accounts to maintain active authentication state by exchanging valid
   * refresh tokens for new access tokens.
   *
   * The refresh mechanism provides a balance between security and user
   * experience:
   *
   * - Long-lived refresh tokens stored securely in session tables
   * - Short-lived access tokens for regular API operations
   * - Automatic token rotation to prevent session hijacking
   * - Graceful handling of expired tokens with appropriate error responses
   *
   * For visitor sessions, this endpoint supports temporary guest accounts
   * that can maintain viewing history and basic platform preferences while
   * preserving the security model appropriate for unauthenticated sessions.
   * Member accounts receive standard JWT management with session management
   * tables tracking their security context.
   *
   * The refresh process validates existing tokens against database records,
   * ensures token integrity, and generates new tokens with updated expiration
   * times while maintaining the user's authentication context. This design
   * ensures both security and session continuity for iBbs platform users.
   */
  export type IRefresh = {
    /**
     * The refresh token used to obtain a new access token. This long-lived
     * token is stored in the session management tables and enables secure
     * token rotation for maintaining session continuity without requiring
     * re-authentication.
     *
     * The refresh token implements a security-by-design approach to session
     * management, providing:
     *
     * - Extended session validity without exposing long-term credentials
     * - Automatic token rotation to maintain security hygiene
     * - Temporary nature reflecting guest session requirements
     * - Graceful session expiration handling
     *
     * This token is particularly crucial for visitor sessions that need
     * temporary guest account functionality while maintaining appropriate
     * security boundaries for unauthenticated users who access the
     * political discussion platform.
     */
    refresh_token: string;
  };
}
