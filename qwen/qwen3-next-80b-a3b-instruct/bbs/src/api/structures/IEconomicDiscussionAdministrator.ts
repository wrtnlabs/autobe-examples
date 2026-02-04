import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicDiscussionAdministrator {
  /**
   * Request payload for refreshing an administrator's authentication session using a valid refresh token. This is used to obtain a new access token without re-authenticating with credentials. Contains only the refresh token string previously issued during login or refresh operations.
   */
  export type IRefresh = {
    /**
     * The refresh token issued during administrator authentication. This token must be valid, not expired, and not revoked to successfully refresh the session. Should be stored securely on the client side and transmitted only to the refresh endpoint.
     *
     * @x-autobe-specification The refresh_token is opaque JWT token issued during administrator authentication and stored in the economic_discussion_administrator_sessions table. The value is validated against the database to ensure it exists, has not expired, and has not been revoked. Client must include the exact token string received from the authentication response. No formatting required; treated as raw string.
     */
    refresh_token: string;
  };

  /**
   * Login request containing email and password for administrator authentication. This is a public endpoint that accepts email and plaintext password credentials to establish a session without prior authentication.
   */
  export type ILogin = {
    /**
     * Email address of the administrator attempting to log in. Must be a valid email format and correspond to an existing administrator account in the system.
     *
     * @x-autobe-specification Used to look up the administrator account in economic_discussion_administrators table. The system searches for records using the citizen_id or citizen field, not a direct email column. This field is validated for email format but does not map directly to a database column.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password for administrator authentication. The backend will hash and compare it with the stored password_hashed value in economic_discussion_administrators table. Clients must provide the raw password, not any hashed version.
     *
     * @x-autobe-specification Receives plaintext password from client, which is compared against the password_hashed value in economic_discussion_administrators table using bcrypt verification. Must never contain hashed values - backend handles all hashing. The password_hashed column exists in the database but is not directly mapped in this DTO - the authentication service handles the comparison.
     */
    password: string;
  };

  /**
   * Request data for a new administrator to register an account. Must contain a valid email address and a secure password (minimum 12 characters with number and special symbol). Includes client session context via href (current page URL) and referrer (previous page URL) for security auditing. Optional ip field provides connection origin information. This request creates a new administrator account with initial session tracking and authentication tokens.
   */
  export type IJoin = {
    /**
     * The email address used to register the administrator account. Must be valid and unique within the system. This email will also be used for communication and login.
     *
     * @x-autobe-specification Used as the unique identifier for administrator account creation. The email is validated for RFC 5322 compliance and stored in the email field of economic_discussion_administrators table after successful registration. It is not directly mapped from a database column. Server-side validation and transformation logic applies before data storage.
     */
    email: string & tags.Format<"email">;

    /**
     * The plaintext password chosen by the administrator during registration. Must meet complexity requirements: minimum 12 characters, including at least one numeric digit and one special character. This password will be securely hashed by the server before storage.
     *
     * @x-autobe-specification Client provides plaintext password. Server will hash using bcrypt before storing in economic_discussion_administrators.password_hashed column. Password must be at least 12 characters and contain at least one number and one special symbol as per security requirements. No direct mapping to database - transformation required by backend service. The database column password_hashed does not exist as a property in the economic_discussion_administrators schema, so this property cannot have a databaseSchemaProperty mapping.
     */
    password: string;

    /**
     * The client's IP address at the time of registration. This is optional and may be omitted. If provided, it will be recorded in the administrator's session log for security auditing purposes. If omitted, the server will automatically capture the requester's IP.
     *
     * @x-autobe-specification Optional client IP address. If provided, it is passed to economic_discussion_administrator_sessions.ip. If not provided, the server extracts the IP address from the incoming HTTP request headers. This is a session auditing field and not mapped to any column in economic_discussion_administrators table. Must be a valid IPv4 or IPv6 format when provided.
     */
    ip?: string | null | undefined;

    /**
     * The URL of the page from which the administrator initiated the registration process. This field is mandatory for security auditing to trace the origin of registration requests. Must be a valid web address (URI format).
     *
     * @x-autobe-specification Mandatory field containing the URL of the current page from which the registration request originated. This URL is not stored in economic_discussion_administrators but is captured and stored in economic_discussion_administrator_sessions.href as part of security auditing. Must be a valid URI format as per RFC 3986.
     */
    href: string & tags.Format<"uri">;

    /**
     * The URL of the previous page the administrator visited before reaching the registration page. This field is mandatory for security auditing to understand user traffic patterns. Must be a valid web address (URI format).
     *
     * @x-autobe-specification Mandatory field containing the URL of the previous page from which the user navigated to the registration page. This URL is not stored in economic_discussion_administrators but is captured and stored in economic_discussion_administrator_sessions.referrer for security auditing and user acquisition analysis. Must be a valid URI format as per RFC 3986.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Authentication response for administrator user login, join, or refresh operations. Contains an identifier for the authenticated administrator and a JWT token for subsequent authenticated requests. The id field uniquely identifies the administrator, and the token provides secure session management across API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the authenticated administrator.
     *
     * @x-autobe-specification Direct mapping from economic_discussion_administrators.id column. UUID primary key used to identify the administrator account in database.
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
   * Summary representation of an administrator for audit and administrative interface display purposes. This type provides essential identification information (ID and name) for administrators who have performed sensitive moderation actions such as issuing bans, approving administrator requests, or managing sections. The summary view is designed for display in administrative logs and audit trails where the administrator's identity needs to be visible but full administrative details are not required. Designed to follow the ISummary pattern - minimal essential fields only, with no sensitive or operational fields.
   */
  export type ISummary = {};
}
