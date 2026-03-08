import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { IEconomicPoliticalBoardMember } from "./IEconomicPoliticalBoardMember";

export namespace IEconomicPoliticalBoardAdmin {
  /**
   * Administrator account registration for the Economic/Political Discussion Board system.
   *
   * Creates a new administrator account by validating email format and uniqueness. Upon successful registration, automatically creates a User record with hashed password and a corresponding Profile record. The operation also checks for existing bans and rejects registration if the user was previously banned.
   */
  export type IJoin = {
    /**
     * Administrator's unique email address. Must be unique across all users and follow standard email format.
     *
     * @x-autobe-specification Email validated against users table for format (RFC 5322) and uniqueness. Stored in users.email column after registration.
     */
    email: string &
      tags.MinLength<1> &
      tags.MaxLength<255> &
      tags.Format<"email">;

    /**
     * Administrator's password (will be securely hashed before storage).
     *
     * @x-autobe-specification User-provided password that will be hashed using bcrypt/argon2 before storing in users.password_hashed column. Minimum 8 characters with complexity requirements.
     */
    password: string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">;

    /**
     * Request origin URL for session tracking.
     *
     * @x-autobe-specification Session context field capturing the request origin URL. Stored in session table for session tracking and security. Required field for admin IJoin DTO.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL for analytics and session tracking.
     *
     * @x-autobe-specification Session context field capturing the referrer URL. Stored in session table for analytics and tracking. Required field for admin IJoin DTO.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address (optional for SSR cases).
     *
     * @x-autobe-specification Session context field capturing the client IP address. Stored in session table. Optional for SSR cases where client cannot determine own IP. Format: IPv4.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request payload for refreshing an administrator's access token. Provides the current refresh token to obtain a new access token, enabling continued authenticated access without re-entering credentials. The refresh token must be a valid JWT issued during the admin's most recent login or refresh operation.
   */
  export type IRefresh = {
    /**
     * Authentication refresh token for obtaining a new access token.
     *
     * @x-autobe-specification JWT refresh token string. This token is extracted from the admin's session token data and validated against the token blacklist/rotation policy. When validated successfully, a new access token is generated and optionally a new refresh token is issued (depending on rotation policy). Input is consumed for validation, not persisted.
     */
    refresh_token: string;
  };

  /**
   * Authentication response for administrator users containing the admin's user ID and JWT tokens for continued API access.
   *
   * This type represents the response from all admin authentication endpoints including registration, login, and token refresh operations. It provides the authenticated admin with their unique user identifier and the JWT tokens necessary for making authenticated API requests.
   *
   * The `id` field contains the administrator's user ID extracted from the JWT token claims. The `token` field contains a complete IAuthorizationToken object with both the short-lived access token for immediate API calls and the long-lived refresh token for session renewal.
   *
   * Both tokens are embedded with the admin's user claims including their userId, email address, and adminGrade (regular or super) if they exist in the administrator roles table. This response type enables seamless authenticated sessions for administrators accessing the Economic/Political Discussion Board system.
   */
  export type IAuthorized = {
    /**
     * Administrator's unique user identifier extracted from JWT token claims.
     *
     * @x-autobe-specification Extracted from JWT token claims (userId sub claim). The JWT access token is generated during authentication and contains encoded claims including user identity. This id is parsed from the JWT payload as the "sub" (subject) claim which holds the userId value.
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
   * Request body for administrator authentication in the Economic/Political Discussion Board system. Contains the credentials required for an admin user to log in, including email and password. The system validates email format, verifies password hash against stored credentials, checks ban status, and generates JWT tokens upon successful authentication.
   */
  export type ILogin = {
    /**
     * Administrator's email address used for authentication.
     *
     * @x-autobe-specification Email format validated. Data sourced from economic_political_board_users.email column. Used for user identification and password lookup during authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * Administrator's password for authentication. Password is hashed server-side for security.
     *
     * @x-autobe-specification Password submitted by user, transformed to hash for comparison with economic_political_board_users.password_hashed column. Secure comparison to prevent timing attacks.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Lightweight administrator role summary for API responses, containing grade level, promotion metadata, and user reference. Used in list views to present administrator information without exposing full user entity details. Includes the admin's display name and profile information via the user reference.
   */
  export type ISummary = {
    /**
     * Unique identifier for this administrator role record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from economic_political_board_administrator_roles.id. UUID primary key generated at record creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The user ID of the administrator who holds this role.
     *
     * @x-autobe-database-schema-property user_id
     * @x-autobe-specification Direct mapping from economic_political_board_administrator_roles.user_id. UUID foreign key referencing user.id in economic_political_board_administrator_roles table.
     */
    userId: string & tags.Format<"uuid">;

    /**
     * Administrator grade level. 'regular' for standard administrative access, 'super' for elevated privileges including promotion/demotion authority.
     *
     * @x-autobe-database-schema-property grade
     * @x-autobe-specification Direct mapping from economic_political_board_administrator_roles.grade. Enum values: 'regular' for standard administrative access, 'super' for elevated privileges including promotion/demotion authority.
     */
    grade: "regular" | "super";

    /**
     * The ID of the administrator who promoted this user to their current grade. Null if promotion predates this tracking field.
     *
     * @x-autobe-database-schema-property promoted_by_user_id
     * @x-autobe-specification Direct mapping from economic_political_board_administrator_roles.promoted_by_user_id. UUID foreign key referencing promotedByUser.id. Nullable when promotion predates this tracking field introduction.
     */
    promotedByUserId: (string & tags.Format<"uuid">) | null;

    /**
     * Timestamp when this administrator was promoted to their current grade level. Null if promotion predates this tracking field.
     *
     * @x-autobe-database-schema-property promoted_at
     * @x-autobe-specification Direct mapping from economic_political_board_administrator_roles.promoted_at. ISO 8601 date-time timestamp. Nullable when promotion predates this tracking field introduction.
     */
    promotedAt: (string & tags.Format<"date-time">) | null;

    /**
     * Timestamp when this administrator role record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from economic_political_board_administrator_roles.created_at. ISO 8601 date-time timestamp automatically set by database at record creation.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this administrator role record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from economic_political_board_administrator_roles.updated_at. ISO 8601 date-time timestamp automatically updated by database on each record modification.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * The user account associated with this administrator role, including display name and profile information.
     *
     * @x-autobe-database-schema-property user
     * @x-autobe-specification Join via economic_political_board_administrator_roles.user_id to economic_political_board_administrator_roles user table, then to Profile table on user.id = Profile.userId. Returns IEconomicPoliticalBoardMember.ISummary containing id, email, displayName, and bio fields.
     */
    user: IEconomicPoliticalBoardMember.ISummary;
  };
}
