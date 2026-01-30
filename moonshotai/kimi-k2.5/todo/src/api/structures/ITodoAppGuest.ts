import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Guest authentication credentials returned after successful session
   * creation or token refresh. Contains the guest's unique identifier and
   * authorization tokens required for subsequent authenticated requests. The
   * access token expires after 15 minutes and must be refreshed using the
   * provided refresh token, which remains valid for 7 days. Guests are
   * temporary unauthenticated visitors who can explore the application before
   * registering as full members.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest user. A UUID generated when the guest
     * session is created.
     *
     * @x-autobe-specification Data sourced from todo_app_guests.id column. This is a UUID v4 generated automatically when the guest record is created during the join operation. The id serves as the primary key for the guest entity and is embedded in the JWT access token as the guest_id claim for authentication purposes.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request DTO for creating a new temporary guest session.
   *
   * Used by unauthenticated visitors to obtain temporary access credentials.
   * Captures connection metadata for security auditing and session tracking.
   * The ip field is optional as the server can extract it from the request,
   * but href and referrer must be provided by the client to track navigation
   * context.
   *
   * Upon successful creation, returns ITodoAppGuest.IAuthorized containing
   * JWT access and refresh tokens.
   */
  export type IJoin = {
    /**
     * Client IP address for security auditing. Optional as server can
     * extract from request headers.
     *
     * @x-autobe-specification Request context field capturing the client's IP address. Not stored as a dedicated column in todo_app_guests table. Used for security auditing, rate limiting, and session tracking. Server can extract from request headers if not provided. May be captured in todo_app_audit_logs for security trail.
     */
    ip?: string | null | undefined;

    /**
     * Current page URL (connection URL). Required for session tracking and
     * audit trail.
     *
     * @x-autobe-specification Request context field capturing the current page URL (connection URL). Not stored as a dedicated column in todo_app_guests table. Used for security audit trail, session tracking, and navigation analysis. May be logged in todo_app_audit_logs for security purposes.
     */
    href: string & tags.Format<"uri">;

    /**
     * Previous page URL (referrer). Required for session tracking and
     * navigation analysis.
     *
     * @x-autobe-specification Request context field capturing the previous page URL (referrer). Not stored as a dedicated column in todo_app_guests table. Used for security audit trail and navigation flow analysis. Helps track user journey and detect potential security threats.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Request DTO for refreshing a guest session's authentication tokens.
   *
   * Contains the refresh token previously issued when the guest session was
   * created. Upon successful validation, the server issues a new access token
   * (15-minute validity) and a new refresh token (7-day validity),
   * implementing token rotation for security.
   *
   * The refresh token is validated by hashing and matching against stored
   * hashes in the guest sessions table. If validation succeeds, the old
   * refresh token is revoked and replaced with the new one to prevent replay
   * attacks.
   */
  export type IRefresh = {
    /**
     * The refresh token string previously issued when the guest session was
     * created. Used to validate the session and obtain new authentication
     * tokens.
     *
     * @x-autobe-specification Request field containing the opaque refresh token string previously issued by the server when the guest session was created. The server applies SHA-256 hashing to this token and searches for a matching hash in the todo_app_guest_sessions table. The refresh_token_hash column stores the hashed value for secure comparison. If a match is found and the session is not expired, the server generates new tokens and updates the session record with the new refresh token hash.
     */
    refreshToken: string;
  };
}
