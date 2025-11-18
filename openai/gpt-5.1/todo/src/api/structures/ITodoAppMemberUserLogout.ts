export namespace ITodoAppMemberUserLogout {
  /**
   * Response returned after successfully logging out the current member user
   * session.
   *
   * The logout operation invalidates the active session in
   * todo_app_memberuser_sessions by setting its expired_at timestamp and
   * revoking associated tokens. This DTO communicates that the operation has
   * completed and provides simple status information suitable for client‑side
   * handling.
   *
   * No sensitive account or token information is included. The client should
   * treat any existing access or refresh tokens as unusable after receiving
   * this response.
   */
  export type IResponse = {
    /**
     * Indicates whether the logout operation for the current session
     * completed successfully.
     *
     * A value of true means the server has marked the underlying session as
     * expired and revoked related tokens according to its internal rules.
     */
    success: boolean;

    /**
     * Human‑readable message describing the logout result.
     *
     * Client applications can display this text in notifications or logs to
     * explain that the user has been signed out from the current device or
     * context.
     */
    message: string;
  };
}
