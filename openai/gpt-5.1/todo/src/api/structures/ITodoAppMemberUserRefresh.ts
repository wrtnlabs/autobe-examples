export namespace ITodoAppMemberUserRefresh {
  /**
   * Request payload for refreshing authentication tokens for a member user.
   *
   * This DTO carries the refresh token previously issued during login or join
   * flows and is used to obtain a new access token (and optionally a new
   * refresh token) without re‑submitting the user’s password. The server
   * validates the token, checks the associated member account status in
   * todo_app_memberusers, and then issues new tokens when appropriate.
   *
   * Sensitive account data such as password hashes or internal flags are
   * never included in this schema. It only transports the opaque refresh
   * token string from client to server.
   */
  export type IRequest = {
    /**
     * Opaque refresh token string issued by the authentication system.
     *
     * This value is treated as an opaque credential by the client and must
     * be provided exactly as issued. The server uses it to locate and
     * validate the underlying session and member user identity before
     * issuing new tokens.
     */
    refreshToken: string;
  };
}
