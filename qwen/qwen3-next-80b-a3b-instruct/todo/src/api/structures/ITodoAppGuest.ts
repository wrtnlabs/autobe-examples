import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Authentication response for guest users after successful registration or
   * session refresh. Contains the guest's unique identifier and JWT access
   * token for temporary system access. This is a secure response type that
   * excludes all sensitive information like passwords or session secrets.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest user in the system. This UUID is
     * generated upon guest account creation and stored in the
     * todo_app_guests table.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_guests.id column. UUID primary key stored in database.
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
   * Request payload containing the refresh token used to extend the guest
   * session's access token. The guest provides their refresh token as a JWT
   * string to obtain a new access token and optionally extend session
   * duration.
   */
  export type IRefresh = {
    /**
     * Refresh token used to obtain a new access token for continued guest
     * session. This JWT string must be provided in the request body and
     * validated against the todo_app_guest_sessions table to authenticate
     * the guest session renewal request.
     *
     * @x-autobe-database-schema-property guest
     * @x-autobe-specification Direct mapping from todo_app_guest_sessions.guest column. This is a JWT string that must be validated against stored session records. The token is used for session extension without requiring re-authentication.
     */
    refreshToken: string;
  };

  /**
   * Request DTO for creating a temporary guest account in the Todo App.
   * Requires email and password for registration, with email validated
   * against existing accounts. Includes connection context fields (href and
   * referrer) for security auditing that must be provided by the client. IP
   * address is optional. The password is received in plain text and hashed by
   * the server before storage. No authentication fields are included in the
   * request body, as authentication context is handled by the authentication
   * system.
   */
  export type IJoin = {
    /**
     * User's email address used to create a guest account. Must be unique
     * and follow standard email format (e.g., user@example.com). This is
     * the primary identifier for the guest account.
     *
     * @x-autobe-specification Direct mapping from todo_app_guests.email column. String value with email format validation. Must be unique and validated against existing guest accounts during registration.
     */
    email: string & tags.Format<"email">;

    /**
     * Password for the guest account. Provided in plain text by client and
     * automatically hashed by the server before storage. Must meet minimum
     * security requirements. Never displayed or exposed in any API
     * responses.
     *
     * @x-autobe-specification Client provides password in plain text. Server-side hash function (bcrypt) transforms it before storing in todo_app_guests.password_hash column. Never stored in plaintext. Length should be at least 8 characters based on security policy.
     */
    password: string;

    /**
     * The URL of the web page from which the guest registration request was
     * initiated. This is captured from the client's browser
     * window.location.href and used for security auditing and analytics.
     * Must be a valid URI format.
     *
     * @x-autobe-specification Required field captured from client-side browser window.location.href. Maps directly to todo_app_guests.href column. Must be a valid URI format. Represents the web page URL from which the guest registration request was initiated.
     */
    href: string & tags.Format<"uri">;

    /**
     * The URL of the previous web page that linked to the guest
     * registration page. This is captured from the client's
     * document.referrer and used for traffic source analysis and security
     * auditing. Must be a valid URI format.
     *
     * @x-autobe-specification Required field captured from client-side document.referrer. Maps directly to todo_app_guests.referrer column. Must be a valid URI format. Represents the URL of the previous web page that linked to the registration page.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * The client's IP address for security auditing and abuse prevention.
     * This field is optional and may be provided by the client or derived
     * by the server from the HTTP request. Validated as an IPv4 or IPv6
     * address format.
     *
     * @x-autobe-specification Optional field that can be provided by client or extracted from server request context. Maps to todo_app_guests.ip column. String representation of IPv4 or IPv6 address. If not provided by client, server can derive it from request headers (X-Forwarded-For, Remote-Addr).
     */
    ip?: string | null | undefined;
  };
}
