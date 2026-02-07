import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoUser {
  /**
   * Request body for user account registration containing authentication credentials, profile information, and session context parameters required for the registration process
   */
  export type IJoin = {};

  /**
   * Token refresh request containing existing refresh token for authentication and session renewal, validated against current user session records.
   */
  export type IRefresh = {
    /**
     * The existing refresh token string used to request a new access token. Must be a valid, unexpired token associated with the current user session for validation purposes.
     *
     * @x-autobe-specification Refresh token is validated against current user's session records without direct database column mapping. Used to verify token validity and generate new access tokens during session renewal.
     */
    refresh_token: string;
  };

  /**
   * User login credentials for authentication. Contains email address and password with required security complexity.
   */
  export type ILogin = {
    /**
     * User's email address for authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from users.email column. Validates email format with format: email.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password for authentication (never stored plaintext).
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Password hash via bcrypt with work factor 12. Matches the password_hash column in users table. Password validation enforces complexity (8+ chars, uppercase, special character).
     */
    password: string &
      tags.MinLength<8> &
      tags.Pattern<"^(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$">;
  };

  /**
   * Authorization response object containing user identifier and JWT token information required for securing all subsequent API requests after authentication. Contains only essential tokens without sensitive user data for security.
   */
  export type IAuthorized = {
    /**
     * Unique user identifier used across all API endpoints.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from users.id. UUID primary key in database.
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
   * Summary view of a user profile containing identifier for context within todo items. Excludes sensitive fields and all timestamps.
   */
  export type ISummary = {
    /**
     * Unique user identifier (UUID).
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_users.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;
  };
}
