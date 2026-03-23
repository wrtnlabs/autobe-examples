import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEcommerceMallAdmin {
  /**
   * Admin authentication response containing account identifier and authorization tokens.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the admin account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from admins.id. UUID primary key for admin account.
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
   * Request body for admin session refresh operation containing refresh token and optional client IP for security auditing.
   */
  export type IRefresh = {
    /**
     * Refresh token for session renewal. Must be valid and not expired.
     *
     * @x-autobe-specification Extracted from request body and stored in admin_sessions table. Represents JWT refresh token for session renewal.
     */
    refresh: string;

    /**
     * Optional client IP address for security auditing.
     *
     * @x-autobe-specification Computed from request context: server extracts client IP from HTTP request headers (X-Forwarded-For or remoteAddress) for security auditing.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for registering a new admin account. Contains email address for login and password for authentication.
   */
  export type IJoin = {
    /**
     * Admin account email address for login and communication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from ecommerce_mall_admins.email. Unique constraint enforced.
     */
    email: string & tags.Format<"email">;

    /**
     * Admin account password (plain text). Securely hashed before storage.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Transforms plain password to password_hash via bcrypt hashing. Backend handles encryption before storage.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Admin login request body containing email and password credentials for authentication.
   */
  export type ILogin = {
    /**
     * Admin's registered email address.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from ecommerce_mall_admins.email. Used to look up admin account for authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * Admin's password in plain text (hashed server-side for verification).
     *
     * @x-autobe-specification Plain text password sent from client. Backend retrieves admin by email, then verifies against stored password_hash in ecommerce_mall_admins using secure hashing algorithm.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Minimal administrator identification for list views and relation references.
   */
  export type ISummary = {
    /**
     * Unique identifier for the administrator account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_admins.id. Primary key for admin identity.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator's email address used for login and communication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from ecommerce_mall_admins.email. Unique constraint enforced.
     */
    email: string & tags.Format<"email">;

    /**
     * Administrator permission grade: 'regular' for standard access or 'super' for elevated privileges.
     *
     * @x-autobe-database-schema-property grade
     * @x-autobe-specification Direct mapping from ecommerce_mall_admins.grade. Indicates 'regular' or 'super' permission level.
     */
    grade: "regular" | "super";

    /**
     * Timestamp when the administrator account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_admins.created_at. Timestamp when admin account was created.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
