import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditMember {
  /**
   * User registration request body for new member accounts with security constraints and validation rules.
   */
  export type IJoin = {
    /**
     * User's email address for authentication and notifications
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Email must match format and be unique in reddit_members.email
     */
    email: string & tags.Format<"email">;

    /**
     * User's password (never stored in plaintext)
     *
     * @x-autobe-specification Password is immediately hashed with bcrypt (12+ rounds) before storage
     */
    password: string &
      tags.MinLength<8> &
      tags.Pattern<"^(?=.*[\\!@#$%^&*]).{8,}$">;

    /**
     * User's display name visible throughout the community
     *
     * @x-autobe-specification Username maps to reddit_profiles.displayName during profile creation
     */
    username: string & tags.MinLength<3> & tags.MaxLength<30>;
  };

  /**
   * Minimal user profile summary for member listing and search interfaces. Includes basic identifiers and creation timestamp for filtering and display.
   */
  export type ISummary = {
    /**
     * Unique identifier for the user account
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_members.id (UUID primary key)
     */
    id: string & tags.Format<"uuid">;

    /**
     * User's email address used for authentication
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_members.email (must be unique)
     */
    email: string & tags.Format<"email">;

    /**
     * Account creation timestamp in UTC
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_members.created_at (UTC timestamp)
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Response structure containing complete authentication tokens with expiration metadata for secure API access. Returns access and refresh tokens with expiration information for seamless token renewal.
   */
  export type IAuthorized = {
    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for member login containing authentication credentials and client context information for JWT token generation.
   */
  export type ILogin = {
    /**
     * User's registered email address for authentication
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Plaintext email for lookup; must match unique email in reddit_members
     */
    email: string & tags.Format<"email">;

    /**
     * User's plaintext password for authentication
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plaintext password submitted for verification; backend hashes it before comparing with stored hash
     */
    password: string;

    /**
     * Original URL that triggered the authentication request
     *
     * @x-autobe-specification Referrer URL from the request initiator; used for session auditing
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer header value for security audit trails
     *
     * @x-autobe-specification Referrer header value from client, indicating origin of the request
     */
    referrer: string & tags.Format<"uri">;

    /**
     * User's IP address for security monitoring (IPv4 format)
     *
     * @x-autobe-specification Client's IP address for location-based security context and audit
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Request body containing JWT refresh token used to renew expired access tokens. The refresh token must be valid and associated with the current user session.
   */
  export type IRefresh = {};

  /**
   * Search and pagination parameters for listing active user members. Used to filter members by email address and registration date range, while paginating the results for interface display.
   */
  export type IRequest = {
    /**
     * Search string for email address matching.
     *
     * @x-autobe-specification Applies LIKE pattern search on members.email for filtering (case-insensitive). Returns matching emails for member listing.
     */
    search?: string | undefined;

    /**
     * Minimum creation timestamp for filtering (ISO 8601 format).
     *
     * @x-autobe-specification Applies min date filter on members.created_at to return members created after this timestamp.
     */
    minCreatedAt?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Maximum creation timestamp for filtering (ISO 8601 format).
     *
     * @x-autobe-specification Applies max date filter on members.created_at to return members created before this timestamp.
     */
    maxCreatedAt?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for results pagination (1-indexed).
     *
     * @x-autobe-specification Page number for paginated results (defaults to 1 when not provided).
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page (1-100).
     *
     * @x-autobe-specification Maximum number of records per page (default: 10, max: 100).
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
