export namespace ITodoAppTodoUserRefresh {
  /**
   * Request body schema for refreshing JWT tokens for an existing todoUser.
   *
   * This DTO carries the refresh token that represents an existing
   * authenticated session for a todo user. The backend validates this token,
   * checks the associated user in `todo_app_todousers`, and optionally
   * consults `todo_app_todouser_sessions` to enforce session lifecycle
   * rules.
   *
   * It does not contain any identity fields such as user ID or email; those
   * are derived from the refresh token payload and database lookups. Clients
   * use this DTO to obtain new access (and possibly refresh) tokens without
   * resending credentials.
   */
  export type IRequest = {
    /**
     * Refresh token issued during a previous authentication flow.
     *
     * The value is an opaque string from the client's perspective,
     * typically a signed JWT or similar token. The server decodes and
     * validates it to identify the todoUser and associated session.
     *
     * Must be a non-empty string and should be transmitted over HTTPS only.
     */
    refreshToken: string;
  };
}
