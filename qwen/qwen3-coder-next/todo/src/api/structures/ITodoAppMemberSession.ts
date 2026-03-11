import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppMemberSession {
  /**
   * Authentication response containing JWT tokens and member information after successful login, registration, or token refresh.
   */
  export type IAuthorized = {
    /**
     * Member profile information including id, email, and profile details.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Member info from todo_app_member_sessions member relation (todo_app_member_id → todo_app_members.id). Returns ITodoAppMember.ISummary containing essential member profile data.
     */
    member: ITodoAppMemberSession.ISummary;

    /**
     * Short-lived JWT access token for authenticating API requests.
     *
     * @x-autobe-database-schema-property access_token
     * @x-autobe-specification JWT access token from session table. Short-lived token for authenticating API requests. Contains encoded claims including user identity and permissions.
     */
    access_token: ITodoAppMemberSession.IAuthenticationToken;

    /**
     * Long-lived JWT refresh token for obtaining new access tokens without re-authentication.
     *
     * @x-autobe-database-schema-property refresh_token
     * @x-autobe-specification JWT refresh token from session table. Long-lived token for obtaining new access tokens without re-authentication. Used for session persistence.
     */
    refresh_token: ITodoAppMemberSession.IAuthenticationToken;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * JWT refresh token used to obtain new access tokens without re-authentication.
   */
  export type IRefresh = {
    /**
     * JWT refresh token used to obtain new access tokens without re-authentication.
     *
     * @x-autobe-database-schema-property refresh_token
     * @x-autobe-specification Direct mapping from todo_app_member_sessions.refresh_token. Used for JWT token refresh validation.
     */
    refresh_token: string;
  };

  /**
   * Member login request containing email and password for authentication.
   */
  export type ILogin = {
    /**
     * Member's email address used for login.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from members.email. Used as login identifier.
     */
    email: string & tags.Format<"email">;

    /**
     * Member's plain text password (server will hash it).
     *
     * @x-autobe-specification User-provided plain text, server hashes to members.password_hash during authentication.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Member registration request body containing authentication credentials and session context for tracking registration source.
   */
  export type IJoin = {
    /**
     * Member's unique email address for authentication
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from todo_app_members.email. Used as login identifier.
     */
    email: string &
      tags.MinLength<1> &
      tags.MaxLength<255> &
      tags.Format<"email">;

    /**
     * Plain text password - backend will hash it during registration
     *
     * @x-autobe-specification Backend hashes this plain text password and stores in todo_app_members.password_hash.
     */
    password: string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">;

    /**
     * HTTP referrer URI from registration request
     *
     * @x-autobe-specification Captured from HTTP request headers during registration. Not stored in database - used for session tracking only.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL from registration request
     *
     * @x-autobe-specification Captured from HTTP request headers during registration. Not stored in database - used for session tracking only.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address (optional, for SSR contexts)
     *
     * @x-autobe-specification Optional client IP address. For SSR contexts, server captures IP if not provided in request body. Not stored in database - used for session tracking only.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * JWT authentication tokens and expiration metadata for member session management.
   */
  export type IAuthenticationToken = {
    /**
     * JWT access token for API authentication.
     *
     * @x-autobe-database-schema-property access_token
     * @x-autobe-specification Direct mapping from todo_app_member_sessions.access_token.
     */
    access_token: string;

    /**
     * JWT refresh token for obtaining new access tokens without re-authentication.
     *
     * @x-autobe-database-schema-property refresh_token
     * @x-autobe-specification Direct mapping from todo_app_member_sessions.refresh_token.
     */
    refresh_token: string;

    /**
     * Expiration timestamp for the access token.
     *
     * @x-autobe-database-schema-property access_expires_at
     * @x-autobe-specification Direct mapping from todo_app_member_sessions.access_expires_at.
     */
    access_expires_at: string;

    /**
     * Expiration timestamp for the refresh token.
     *
     * @x-autobe-database-schema-property refresh_expires_at
     * @x-autobe-specification Direct mapping from todo_app_member_sessions.refresh_expires_at.
     */
    refresh_expires_at: string;

    /**
     * Session expiration timestamp.
     *
     * @x-autobe-specification Direct mapping from todo_app_member_sessions.expired_at. Nullable.
     * @x-autobe-database-schema-property expired_at
     */
    expired_at?: string | null | undefined;
  };

  /**
   * Summary view of a member with essential identification and profile information for authentication contexts.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property email
     */
    email: string;
    /**
     * @x-autobe-database-schema-property profile
     */
    displayName: string;
  };
}
