import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Request body for refreshing an authenticated guest's JWT tokens. Provides the refresh token to obtain new access and refresh tokens without re-authentication.
   */
  export type IRefresh = {
    /**
     * The refresh token received from the client to validate session.
     *
     * @x-autobe-specification Refresh token string extracted from request body and validated against the stored session record in todo_app_guest_sessions table. The token is matched with the refreshable_until timestamp to verify session validity.
     */
    refresh: string & tags.Format<"uri">;
  };

  /**
   * Authorized guest authentication response containing JWT tokens and identification information. This response is returned after successful guest registration (join) or token refresh operations, providing the client with credentials for accessing protected API endpoints.
   */
  export type IAuthorized = {
    /**
     * Unique guest account identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from JWT payload. UUID format representing the guest account identifier.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;

    /**
     * Guest account email address used for authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from JWT payload. Email address used for guest account authentication. Unique across all guest accounts.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Request body for creating a new guest account with authentication credentials and session context. Captures email and password for registration, display name for user identity, and device/browser information for tracking the registration source.
   */
  export type IJoin = {
    /**
     * Unique email address for guest account authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from todo_app_guests.email. Unique constraint with case-insensitive comparison. RFC 5322 email format validation required.
     */
    email: string & tags.Format<"email">;

    /**
     * User's account password (provided in plain text, hashed before storage).
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain text password input from user, hashed using bcrypt before storage in todo_app_guests.password_hash column. Minimum 8 characters required. Password is not stored in plain text anywhere.
     */
    password: string & tags.Format<"password">;

    /**
     * User's display name for identity purposes (2-20 characters).
     *
     * @x-autobe-specification User-provided display name for guest identity. Stored in todo_app_user_profiles table associated with the guest account. Minimum 2 characters, maximum 20 characters. Not a direct column in todo_app_guests table.
     */
    displayName: string & tags.MinLength<2> & tags.MaxLength<20>;

    /**
     * URL of the page where registration occurred.
     *
     * @x-autobe-specification Session context field capturing the current page URL at registration time. Stored in todo_app_guest_sessions table with the session record. Required field for tracking registration source.
     */
    href: string & tags.Format<"uri">;

    /**
     * URL of the page that linked to the registration page.
     *
     * @x-autobe-specification Session context field capturing the referring URL (where user came from). Stored in todo_app_guest_sessions table with the session record. Required field for tracking registration source.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for device tracking (optional, IPv4 format).
     *
     * @x-autobe-specification Optional session context field capturing client IP address for device tracking. Stored in todo_app_guest_sessions table. IPv4 format. May be null in SSR scenarios where server captures IP instead.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
