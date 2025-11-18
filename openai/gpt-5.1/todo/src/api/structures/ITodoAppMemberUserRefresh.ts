import { tags } from "typia";

export namespace ITodoAppMemberUserRefresh {
  /**
   * Request payload for refreshing authentication tokens for a member user in
   * the todoApp service.
   *
   * This DTO carries the refresh token issued during a previous
   * authentication flow and optional session correlation metadata so the
   * backend can validate that the token is still associated with an active or
   * acceptable session.
   *
   * The server validates the refresh token against member identity records
   * stored in the `todo_app_memberusers` table and may optionally cross-check
   * an associated session in `todo_app_memberuser_sessions` before issuing a
   * new `ITodoAppMemberUser.IAuthorized` response.
   */
  export type ICreate = {
    /**
     * Opaque refresh token previously issued to the member user.
     *
     * The backend uses this token to locate and verify the corresponding
     * member record in `todo_app_memberusers` and, optionally, a session
     * record in `todo_app_memberuser_sessions`. The exact format is
     * implementation specific (for example, a JWT or random string) and
     * should be treated as a confidential credential by clients.
     */
    refresh_token: string;

    /**
     * Optional identifier of the member user session associated with this
     * refresh attempt.
     *
     * When provided, this UUID typically corresponds to a row in
     * `todo_app_memberuser_sessions.id`. The server can use it to ensure
     * that the refresh token is being used from the same logical session
     * context and to reject tokens tied to expired or revoked sessions.
     */
    session_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional client IP address observed when performing the refresh.
     *
     * Although the canonical IP may be derived from the HTTP request on the
     * server, clients or intermediaries can supply this field to capture
     * the most accurate origin information for auditing and anomaly
     * detection. When present, it is compared against past session metadata
     * as part of security checks.
     */
    ip?: string | undefined;

    /**
     * Optional full URL (href) of the page or route where the refresh
     * request is initiated.
     *
     * This helps correlate refresh operations with specific user interface
     * locations in the client application. It may be used for security
     * analytics or troubleshooting but is not required for token
     * validation.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * Optional referrer URL indicating the previous page or context leading
     * to this refresh call.
     *
     * This can be used in conjunction with `href` for navigation analysis
     * and security monitoring but is not required for successful token
     * refresh.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;
  };
}
