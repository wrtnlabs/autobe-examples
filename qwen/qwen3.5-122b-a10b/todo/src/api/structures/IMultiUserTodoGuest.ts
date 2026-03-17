import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IMultiUserTodoGuest {
  /**
   * Authentication response containing JWT tokens and guest account information. Returned when a guest successfully registers or refreshes their session, providing both the authentication credentials and basic account details. The response includes the guest's unique identifier, email address, optional display name, account creation timestamp, and a token object containing the access token, refresh token, and their expiration times. Clients should store these tokens securely and use the access token for authenticated API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.id. UUID primary key, auto-generated on account creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address used for account identification and authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.email. Unique constraint enforced at database level.
     */
    email: string & tags.Format<"email">;

    /**
     * Optional display name shown to the user in the application.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.display_name. Nullable field, optional user-provided display name.
     */
    display_name?: string | null | undefined;

    /**
     * Timestamp when the guest account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.created_at. Timestamp with timezone, auto-set on account creation.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body containing the refresh token for extending an authenticated guest session. This token is validated to issue new access and refresh tokens without requiring re-authentication.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for extending the guest's authenticated session.
     *
     * @x-autobe-specification JWT refresh token extracted from request body. Backend validates token signature against multi_user_todo_guest_sessions table, checks expiration, and verifies associated guest account is active.
     */
    refresh_token: string;
  };

  /**
   * Request body for guest user registration. This endpoint creates a new guest account with email and password credentials. The email must be unique across all registered guests and must follow valid email format. The password is provided in plain text and will be securely hashed using bcrypt before storage. An optional display name can be provided for user identification. Session context fields (href, referrer, ip) are required to track the registration request origin for security and analytics purposes.
   */
  export type IJoin = {
    /**
     * Unique email address for account identification and authentication.
     *
     * @x-autobe-database-schema-property email
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password that will be securely hashed using bcrypt before storage.
     *
     * @x-autobe-database-schema-property password_hash
     */
    password: string & tags.MinLength<8>;

    /**
     * Optional display name shown to the user in the application.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.display_name. Nullable field, optional user-provided display name.
     */
    display_name?:
      | (string & tags.MinLength<1> & tags.MaxLength<100>)
      | null
      | undefined;

    /**
     * Current URL of the registration page for session tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * Previous URL (referrer) for session tracking and analytics.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session tracking. Optional for SSR scenarios.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
