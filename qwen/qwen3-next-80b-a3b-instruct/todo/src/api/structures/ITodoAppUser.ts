import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppUser {
  /**
   * Request body for registering a new user account with email and password. The system validates the email format and password strength (minimum 8 characters). Password is securely hashed on the server and never stored in plain text. This is the only endpoint where the user submits their password in plain text.
   */
  export type IJoin = {
    /**
     * User's unique login email address.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from todo_app_users.email. Must be unique and RFC 5322 compliant.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password for authentication. Must be at least 8 characters.
     *
     * @x-autobe-specification Client provides plaintext password; server hashes with bcrypt and stores in todo_app_users.password_hash. This field is never stored or queried directly in the database.
     */
    password: string & tags.MinLength<8>;
  };

  /**
   * Response type returned upon successful user authentication (login, join, or refresh). Contains the user's unique identifier and security tokens needed to make subsequent authenticated API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user, sourced from the todo_app_users table.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_users.id. Used as the primary user identifier in all authenticated requests.
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
   * A refresh token string used to obtain a new access token when the current one expires. This token is securely stored server-side in the session table and is never transmitted in plain form during regular API calls — only during the refresh endpoint invocation.
   */
  export type IRefresh = {
    /**
     * A refresh token string used to obtain a new access token when the current one expires. This token is securely stored server-side in the session table and is never transmitted in plain form during regular API calls — only during the refresh endpoint invocation.
     *
     * @x-autobe-specification The refresh_token is an opaque, client-provided string presented during token refresh requests. This string is not a column in the database but represents a token issued by the authentication system and stored server-side in the todo_app_user_sessions table's internal token storage. The server validates this string against its session store; if valid and unexpired, it issues new tokens. This DTO accepts only this string input. The column 'token' does not exist in the todo_app_user_sessions schema - the actual token storage mechanism is internal to the session management layer and not exposed as a column.
     */
    refresh_token: string;
  };

  /**
   * Request body for authenticating a user via email and password. Contains login credentials used to validate identity against the system's user records. No user identifiers or token information should be included—only the plain-text email and password provided by the user during login.
   */
  export type ILogin = {
    /**
     * @x-autobe-database-schema-property email
     */
    email: string & tags.Format<"email">;
    /**
     * @x-autobe-database-schema-property password_hash
     */
    password: string;
  };

  /**
   * Lightweight summary of the authenticated user for display purposes. Contains only the user's display name and account metadata (creation and last update timestamps). Does not include email, internal ID, authentication status, or sensitive information. Used in API responses to represent user ownership without revealing private details.
   */
  export type ISummary = {
    /**
     * The user's public-facing display name. Visible to the user themselves but never exposed to other users. Can be edited by the user at any time.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from todo_app_profiles.display_name.
     */
    display_name: string;

    /**
     * Timestamp when the user account was created and profile activated. Indicates the lifecycle start of the user's data.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from todo_app_profiles.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent edit to the user's display name. Used to indicate profile activity without exposing any historical edit details.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from todo_app_profiles.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
