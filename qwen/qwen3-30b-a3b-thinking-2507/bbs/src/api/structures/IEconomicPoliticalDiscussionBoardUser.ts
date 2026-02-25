import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicPoliticalDiscussionBoardUser {
  /**
   * Request body for user registration containing email, password, and session tracking information to track registration origin.
   */
  export type IJoin = {
    /**
     * User's email address, used as login identifier.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from users.email. Email must be unique and formatted as per RFC 5322.
     */
    email: string & tags.Format<"email">;

    /**
     * User's plaintext password.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plaintext password is hashed with bcrypt. Password must have 8+ characters including at least one uppercase letter.
     */
    password: string;

    /**
     * HTTP referrer URL origin of registration request.
     *
     * @x-autobe-specification Tracks registration origin URL for user journey analysis. Required for security and session validation.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referral source URL if available.
     *
     * @x-autobe-specification Tracks referral source for marketing analytics. Required for tracking user acquisition channels.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * User's IPv4 address for security context.
     *
     * @x-autobe-specification IPv4 address of client for anti-fraud measures and regional targeting. Optional for SSR environments.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Public user profile summary containing essential identifier, display name, and account role. Used in contexts where sensitive information like email should not be exposed.
   */
  export type ISummary = {
    /**
     * Unique user identifier
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct from users.id (UUID) column
     */
    id: string & tags.Format<"uuid">;

    /**
     * User's configured display name
     *
     * @x-autobe-specification Join via profiles.display_name (from users.profile)
     */
    displayName?: string | null | undefined;

    /**
     * User's account role (user, admin, super-admin)
     *
     * @x-autobe-database-schema-property role
     * @x-autobe-specification Direct from users.role column
     */
    role: string;
  };

  /**
   * Request body containing refresh token used to renew authentication session. Must be valid and unexpired. Token is computed during session management and not stored as a direct database field.
   */
  export type IRefresh = {
    /**
     * Refresh token used to renew authentication session without user re-authentication
     *
     * @x-autobe-specification Derived from session management logic. Not a direct DB column. Validation checks token expiration and association via existing session columns.
     */
    refreshToken: string;
  };

  /**
   * User login credentials for authentication. Contains email address and plain text password to authenticate against the user database.
   */
  export type ILogin = {
    /**
     * User's email address used for login and authentication
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping to database's 'email' column with unique constraint. Validates email format matching requirements.
     */
    email: string;

    /**
     * User's unhashed password (plain text input for authentication)
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain text input (backend will hash using bcrypt) for password_hash comparison. Enforces minimum complexity (8+ characters, uppercase) as specified in password requirements.
     */
    password: string;
  };

  /**
   * Query parameters for filtering and paginating user listings in administrative interfaces. Includes search terms for email matching, role-based filtering (user, admin, super-admin), ban status visibility, and pagination options optimized for management workflows.
   */
  export type IRequest = {
    /**
     * Partial email text for matching (e.g., 'john@domain.com' matches 'john@domain.com' and 'johndoe@domain.com')
     */
    search?: string | undefined;

    /**
     * Filter users by role (user, admin, or super-admin)
     */
    role?: "user" | "admin" | "super-admin" | undefined;

    /**
     * Filter users by ban status (true = banned users, false = active users)
     */
    banned?: boolean | undefined;

    /**
     * Page number for pagination (starts at 1)
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page (max 100)
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Authentication response containing JWT access token for API authorization and authenticated user profile details. The token must be provided in all authenticated requests using the Bearer scheme and includes the user's identity (id, email, role) without sensitive information.
   */
  export type IAuthorized = {
    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;

    /**
     * Authenticated user profile details including identifier, email address, and access level.
     *
     * @x-autobe-specification User identity mapping from economic_political_discussion_board_users table. Includes core properties: id, email, role, excluding sensitive fields like password_hash. Role enum: user, admin, super-admin.
     */
    user: {
      id: string & tags.Format<"uuid">;
      email: string;
      role: "user" | "admin" | "super-admin";
    };
  };
}
