import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformAdmin {
  /**
   * Request body for admin authentication containing email and plaintext password. Password will be hashed on server for secure verification against database.
   */
  export type ILogin = {};

  /**
   * Administrative user's refresh token for obtaining new authentication tokens. Must be a valid UUID and match an active session record.
   */
  export type IRefresh = {
    /**
     * Administrative user's refresh token for obtaining new authentication tokens. Must be a valid UUID and match an active session record.
     *
     * @x-autobe-specification Direct mapping from community_platform_admin_sessions.refresh_token. Validates against active session record with expiration checks. Note: The 'refresh_token' column is a standard field in the session database table, even though it was not initially listed in the property enumeration.
     */
    refresh_token: string & tags.Format<"uuid">;
  };

  /**
   * Authorization response containing administrative user ID and JWT access tokens for secure platform access with refresh token functionality.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the administrative user account in the system.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_admins.id. This is the primary key for the admin user account.
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
   * Admin registration request body. Contains unique business email and plaintext password for new administrative account creation. Password will be securely hashed during processing; plaintext is never stored.
   */
  export type IJoin = {
    /**
     * Admin's business email address for account identification and verification. Must be unique across all admin accounts.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from community_platform_admins.email. Must be valid business email format. Database has unique constraint.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password provided during registration. This will be securely hashed and stored; never shown in API or database.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plaintext password provided by user. Must be hashed using bcrypt before storage. Generated during registration: password_hash = bcryptHash(plaintext_password). Database column is password_hash, not plaintext password.
     */
    password: string;
  };

  /**
   * Compact administrative user summary for moderation operations. Contains essential account identifiers without sensitive security data, providing necessary context for moderation actions without overwhelming UI elements.
   */
  export type ISummary = {
    /**
     * Unique identifier for the admin account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_admins.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Admin's email address used for authentication and notifications.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from community_platform_admins.email. Email address used for authentication.
     */
    email: string;

    /**
     * Timestamp when the admin account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_admins.created_at. Timestamp when admin account was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the admin account was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from community_platform_admins.updated_at. Timestamp when admin account was last updated.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
