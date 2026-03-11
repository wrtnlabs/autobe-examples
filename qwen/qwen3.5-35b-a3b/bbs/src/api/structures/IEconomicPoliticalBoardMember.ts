import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicPoliticalBoardMember {
  /**
   * Request body for refreshing an access token. Submit a valid refresh token to obtain a new pair of access and refresh tokens without re-authentication. This enables seamless continued access to protected resources while maintaining security through token rotation.
   */
  export type IRefresh = {
    /**
     * Refresh token for renewing access credentials. This is a JWT string that must be valid and not expired. The token will be validated by the server, and upon successful validation, new access and refresh tokens will be issued.
     *
     * @x-autobe-specification JWT refresh token provided by client. The server validates the token's cryptographic signature and expiration timestamp. On successful validation, a new token pair is generated (token rotation). The refresh token is not stored as a database column but validated against session state and JWT claims.
     */
    refresh: string;
  };

  /**
   * Login credentials for an existing member account. Provides the email address and password required to authenticate the member and obtain access tokens for API operations.
   */
  export type ILogin = {
    /**
     * Member's email address used to identify their account. The system will query the User table by this email to locate the account for authentication.
     *
     * @x-autobe-specification Email address provided by the member for authentication. Used to query the database to locate the corresponding User record. Validation: email must exist in the database, must be valid email format.
     */
    email: string & tags.Format<"email">;

    /**
     * Member's password for authentication. This plain text value is hashed using bcrypt or argon2 and verified against the stored password hash in the database.
     *
     * @x-autobe-specification Plain text password provided by the member. The system hashes this value using bcrypt or argon2 and verifies it against the stored passwordHashed column in the users table. Password is never stored as plain text in the database or API responses. Validation: must match the stored hash, minimum length requirements apply.
     */
    password: string;
  };

  /**
   * Authentication response containing member identifier and JWT tokens for accessing protected resources.
   *
   * This response is returned upon successful registration, login, or token refresh operations. The id field contains the unique member identifier extracted from the authentication token. The token object contains the complete authorization token structure with access and refresh tokens along with their expiration timestamps.
   *
   * Members use the access token to authenticate API requests by including it in the Authorization header. The refresh token allows obtaining new access tokens without re-entering credentials. Both tokens have defined expiration times to ensure security.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated member.
     *
     * A UUID string representing the member's unique identity in the system. This identifier is extracted from the authentication token and used to correlate API requests with the specific member. Available after successful registration, login, or token refresh.
     *
     * @x-autobe-specification Member identifier extracted from JWT subject claim (User.id). This is a UUID string representing the authenticated member's unique identifier in the database. Populated by: 1) During registration: new User.id from created record, 2) During login: User.id from queried User record, 3) During refresh: same User.id from JWT verification. Used by API middleware to identify the authenticated user for authorization checks.
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
   * Registration request body for creating a new member account in the Economic/Political Discussion Board system. This endpoint accepts an email address and password for authentication, along with the user's display name for their profile. Session context information (current page URL, referrer, and IP address) is required for security tracking, analytics, and fraud prevention purposes.
   */
  export type IJoin = {
    /**
     * User's email address for authentication and account identification.
     *
     * @x-autobe-specification User email for authentication. Validated for proper format and database uniqueness constraint.
     */
    email: string & tags.Format<"email">;

    /**
     * Account password for authentication.
     *
     * @x-autobe-specification Plaintext password for authentication. Backend MUST hash using bcrypt/argon2 to User.passwordHash.
     */
    password: string;

    /**
     * Display name shown in user profiles and content attribution.
     *
     * @x-autobe-specification Display name for Profile record. Created in same transaction as User via Profile relation with userId FK.
     */
    name: string;

    /**
     * URL of the page where registration was initiated.
     *
     * @x-autobe-specification URL of current page where registration initiated. Captured from browser session.
     */
    href: string & tags.Format<"uri">;

    /**
     * URL of the page that referred the user to registration.
     *
     * @x-autobe-specification Referring page URL that directed user to registration. Captured from HTTP request header.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address captured at registration time for security tracking.
     *
     * @x-autobe-specification Client IP address for security logging. Optional when client cannot determine its own IP (SSR case), server captures as fallback.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Lightweight member entity for display in article listings and user references. Contains essential identification fields including member identifier, display name for user presentation, and account creation timestamp.
   */
  export type ISummary = {
    /**
     * Unique identifier for the member.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from economic_political_board_administrator_roles.id. UUID primary key identifying the member record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the member account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from economic_political_board_administrator_roles.created_at. Timestamp when member account was created.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Display name of the member for user identification and article author attribution.
     *
     * @x-autobe-specification Computed property: JOIN economic_political_board_administrator_roles with user profiles table on user_id, select display_name field. Returns the member's display name for user identification and article author attribution. This is a cross-table join result, not a direct column mapping.
     */
    displayName: string;
  };
}
