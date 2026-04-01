import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IMultiUserTodoMember {
  /**
   * Login credentials for member authentication with session context information. Contains email and password for authentication, plus href (current page URL), referrer, and optional IP address for session tracking.
   */
  export type ILogin = {
    /**
     * Member's email address for authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from multi_user_todo_members.email. Used to lookup member account for authentication. Must be valid email format and match existing account.
     */
    email: string & tags.Format<"email">;

    /**
     * Member's password for authentication.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain text password provided by user. Backend verifies against multi_user_todo_members.password_hash using bcrypt comparison. Never stored in plain text.
     */
    password: string & tags.Format<"password">;

    /**
     * URL of the page where the login was initiated.
     *
     * @x-autobe-specification Session context: current page URL where login was initiated. Stored in multi_user_todo_member_sessions upon successful authentication. Not mapped to members table.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL from the login request.
     *
     * @x-autobe-specification Session context: referrer URL from HTTP headers. Stored in multi_user_todo_member_sessions upon successful authentication. Not mapped to members table.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session tracking (optional, server may capture as fallback).
     *
     * @x-autobe-specification Session context: client IP address. Optional in login request (server can capture as fallback). Stored in multi_user_todo_member_sessions upon successful authentication. Not mapped to members table.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for refreshing authentication tokens using a valid refresh token. Contains the refresh token that will be validated against existing member sessions. The token must correspond to an active, non-expired session belonging to a valid member account that has not been soft-deleted.
   */
  export type IRefresh = {
    /**
     * Refresh token for obtaining new access tokens without re-authentication. This long-lived token is issued during login or join operations and must be included in the request body to refresh an expired access token. The token is validated against the member sessions table and must correspond to an active, non-expired session.
     *
     * @x-autobe-specification JWT refresh token string validated against multi_user_todo_member_sessions table. Backend extracts session identifier from the token payload, queries the session record, verifies session.expired_at timestamp is in the future, confirms the associated member exists in multi_user_todo_members with deleted_at null. On success, generates new access and refresh tokens and updates session.expired_at. On failure, returns 401 for invalid/expired token or 403 for deleted account.
     */
    refresh_token: string;
  };

  /**
   * Request body for registering a new member account with email and password authentication. Email must be unique across all member accounts. Password is provided in plain text and will be hashed using bcrypt by the backend. Session context fields track the registration source for security auditing.
   */
  export type IJoin = {
    /**
     * User's email address for authentication and account identification. Must be unique and in valid email format.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from multi_user_todo_members.email. Must be unique across all member accounts. Validated for email format.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password in plain text. Will be hashed using bcrypt by the backend before storage. Must meet minimum security requirements.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to multi_user_todo_members.password_hash. Plain text password provided by user, backend bcrypt-hashes before storage. Minimum length and complexity validation applied.
     */
    password: string & tags.Format<"password">;

    /**
     * URL of the page where the user initiated registration. Used for session tracking and security auditing.
     *
     * @x-autobe-specification Session context field. Current page URL where registration was initiated. Stored in multi_user_todo_member_sessions for auditing. Not mapped to members table.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating where the user came from before registration. Used for analytics and security auditing.
     *
     * @x-autobe-specification Session context field. Referrer URL from HTTP headers indicating traffic source. Stored in multi_user_todo_member_sessions for auditing. Not mapped to members table.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address at time of registration. Used for security auditing and session tracking. If not provided, server captures it automatically.
     *
     * @x-autobe-specification Session context field. Client IP address captured from request or server fallback. Stored in multi_user_todo_member_sessions for auditing. Optional in request (server captures as fallback). Not mapped to members table.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Authentication response containing member identification and JWT tokens for authenticated sessions. Returned after successful member registration, login, or token refresh operations.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated member.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from multi_user_todo_members.id. UUID format.
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
   * Lightweight summary view of a member account. Contains the member's unique identifier and public display name for ownership attribution in todo and session responses.
   */
  export type ISummary = {
    /**
     * Unique member identifier in UUID format.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from multi_user_todo_members.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Member's public display name from their profile, shown in the application interface.
     *
     * @x-autobe-specification Computed via JOIN from multi_user_todo_members.id to multi_user_todo_user_profiles.display_name where user_profiles member_id matches members.id. Returns the user's public display name.
     */
    displayName: string;
  };
}
