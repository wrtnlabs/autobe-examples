import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { IRedditCommunityUserProfile } from "./IRedditCommunityUserProfile";

export namespace IRedditCommunityMember {
  /**
   * Request body for creating a new member account. Users provide their email address, password, and session context information to register on the platform. Upon successful registration, a new member account is created and the user is automatically authenticated with JWT tokens.
   */
  export type IJoin = {
    /**
     * User's email address used for login and account identification.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_members.email. Must be unique across all members. Backend validates uniqueness before creating account.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password for authentication. Must meet security requirements (e.g., minimum length, complexity).
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification User provides plain text password (not hashed). Backend applies bcrypt hashing with salt rounds before storing in password_hash column of reddit_community_members table.
     */
    password: string & tags.Format<"password">;

    /**
     * The URL of the page where the registration form was accessed.
     *
     * @x-autobe-specification Captures the source URL of the registration page. This is a session context field that comes from the HTTP Referer header or client-side tracking. Used for analytics and session tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * The URL that referred the user to the registration page.
     *
     * @x-autobe-specification Captures the referring URL that led the user to the registration page. This is a session context field captured from HTTP headers or client-side tracking. Used for attribution and analytics.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * The client's IP address. Optional in this context because it may be captured by the server in SSR environments.
     *
     * @x-autobe-specification Captures the client IP address for security and session context. This is optional because in SSR (Server Side Rendering) environments, the client cannot know its own IP - the server captures it as fallback. Used for rate limiting, security auditing, and fraud detection.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Request body for token refresh operation. Used by authenticated members to renew their expired access tokens using a valid refresh token without requiring re-login with credentials.
   */
  export type IRefresh = {
    /**
     * Refresh token for renewal. Used to obtain a new access token when the current one expires, allowing session continuation without re-entering credentials.
     *
     * @x-autobe-specification Refresh token for validation and renewal. The token is validated against reddit_community_member_sessions table by checking status='active' and expiresAt > now. On successful validation, a new access token is generated and returned along with a new refresh token (rotation). This is a JWT-encoded value that represents the session's refresh capability, not stored as a direct database column.
     */
    refreshToken: string;
  };

  /**
   * Lightweight member account summary for list views. Contains essential identification fields: unique identifier, display username, masked email address, and account creation timestamp. When joined with profile data, includes display name, bio text, avatar URL, and karma score. Designed for efficient display in feeds, comment threads, and member directories where full profile details are not needed.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property username
     */
    username: string;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;
    profile?: IRedditCommunityUserProfile.ISummary | undefined;
    karma?: (number & tags.Type<"int32">) | undefined;
  };

  /**
   * Authenticated session response containing JWT access and refresh tokens. This type is returned when a member successfully logs in, registers, or refreshes their session. The access token provides immediate API access, while the refresh token allows obtaining new access tokens without re-entering credentials. Token expiration is tracked to enable automatic token renewal before expiry.
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
   * Public member profile containing the user's display name, biography, avatar image URL, karma score, and account creation timestamp. This profile is accessible to all users and guests without authentication. Sensitive information such as email addresses and password hashes are never exposed. Soft-deleted accounts return 404 to maintain account deletion privacy.
   */
  export type IProfile = {
    /**
     * Unique username chosen during registration. This is the primary human-readable identifier used throughout the platform and cannot be changed after account creation.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from reddit_community_users.username. Unique constraint ensures one username per account. Cannot be changed after registration.
     */
    username: string;

    /**
     * Display name shown to other users in comments, posts, and feeds. Can be updated by the user and may be null or empty.
     *
     * @x-autobe-specification LEFT JOIN from reddit_community_user_profiles.display_name via user_id. Optional field that can be null or empty.
     */
    display_name?: string | null | undefined;

    /**
     * User's biography text that appears on their profile page. Can be updated by the user and may be null or empty.
     *
     * @x-autobe-specification LEFT JOIN from reddit_community_user_profiles.bio via user_id. Optional field that can be null or empty.
     */
    bio?: string | null | undefined;

    /**
     * CDN URL for the user's avatar image. Points to the user's uploaded avatar file or null if no avatar has been set.
     *
     * @x-autobe-specification LEFT JOIN from reddit_community_user_profiles.avatar_image_url_id via user_id, then resolve to CDN URL via reddit_community_files. Optional field that returns null URL if no avatar uploaded.
     */
    avatar_image_url?: (string & tags.Format<"url">) | null | undefined;

    /**
     * Total karma score reflecting the user's community engagement. Calculated from all upvotes and downvotes received on posts and comments. Can be negative if downvotes exceed upvotes.
     *
     * @x-autobe-specification LEFT JOIN from reddit_community_user_karmas.current_score via member_id. Aggregates all upvotes and downvotes received on the user's posts and comments. Can be negative, zero, or positive. Updated in real-time when votes are cast, changed, or removed.
     */
    karma: number & tags.Type<"int32">;

    /**
     * Account creation timestamp in ISO 8601 format. Indicates when the user registered on the platform.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_users.created_at. ISO 8601 formatted timestamp of account creation.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Login request containing member credentials. The email identifies the account to authenticate, and the password is verified against the stored hash to establish a new authenticated session.
   */
  export type ILogin = {
    /**
     * The member's email address used to identify the account for login.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Maps to reddit_community_members.email column. Used to query member record for authentication. Must be valid email format.
     */
    email: string & tags.Format<"email">;

    /**
     * The member's password for authentication. Sent as plaintext and hashed using bcrypt for comparison against stored hash.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plaintext password provided by user. Transformed to hash and compared against reddit_community_members.password_hash column using bcrypt.compare(). On success, JWT session created.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Request parameters for filtering and paginating member account listings.
   */
  export type IRequest = {
    /**
     * Partial match search on username and email (case-insensitive).
     *
     * @x-autobe-specification Partial match search on username and email columns (case-insensitive LIKE query). Uses %value% pattern for substring matching. Implementation: WHERE username LIKE '%' || $search || '%' OR email LIKE '%' || $search || '%'
     */
    search?: string | undefined;

    /**
     * Filter members created after this timestamp.
     *
     * @x-autobe-specification Filter members created after this timestamp. Implementation: WHERE created_at >= $created_from (ISO 8601 datetime)
     */
    created_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter members created before this timestamp.
     *
     * @x-autobe-specification Filter members created before this timestamp. Implementation: WHERE created_at <= $created_to (ISO 8601 datetime)
     */
    created_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Account status filter.
     *
     * @x-autobe-specification Account status filter. Implementation: status='active' means deleted_at IS NULL, status='deleted' means deleted_at IS NOT NULL
     */
    status?: "active" | "deleted" | undefined;

    /**
     * Page number (1-indexed).
     *
     * @x-autobe-specification Page number (1-indexed). Implementation: OFFSET = (page - 1) * limit. Minimum value is 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Items per page (default: 20).
     *
     * @x-autobe-specification Items per page (default: 20). Implementation: LIMIT clause. Validated range: 1 to 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort field.
     *
     * @x-autobe-specification Sort field. Implementation: ORDER BY created_at or username. Allowed values: 'created_at' or 'username'
     */
    sortBy?: "created_at" | "username" | undefined;

    /**
     * Sort order (default: desc for created_at, asc for username).
     *
     * @x-autobe-specification Sort order (default: desc for created_at, asc for username). Implementation: ORDER BY ... ASC or DESC. Allowed values: 'asc' or 'desc'
     */
    sortOrder?: "asc" | "desc" | undefined;
  };
}
