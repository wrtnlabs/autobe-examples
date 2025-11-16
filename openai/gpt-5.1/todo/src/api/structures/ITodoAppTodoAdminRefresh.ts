export namespace ITodoAppTodoAdminRefresh {
  /**
   * Request payload for refreshing JWT credentials for a todoAdmin
   * administrative operator.
   *
   * This DTO carries only the refresh token and optional session correlation
   * information required to validate and rotate tokens for an existing
   * administrator session. It does not include any identity fields such as
   * admin IDs or email addresses, which are derived from the token itself and
   * the underlying `todo_app_todoadmins` and `todo_app_todoadmin_sessions`
   * records.
   *
   * The structure is intentionally minimal to reduce attack surface and to
   * decouple the external token contract from internal session storage
   * details.
   */
  export type IRequest = {
    /**
     * Opaque refresh token previously issued to the todoAdmin during login
     * or a prior refresh.
     *
     * The backend validates this token's signature and claims, resolves it
     * to a specific admin identity in `todo_app_todoadmins`, and optionally
     * associates it with a session row in `todo_app_todoadmin_sessions`.
     * The exact format is implementation-specific and should be treated as
     * an opaque string by clients.
     */
    refresh_token: string;
  };
}
