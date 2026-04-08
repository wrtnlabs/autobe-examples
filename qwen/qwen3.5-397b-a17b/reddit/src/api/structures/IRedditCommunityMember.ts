import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCommunityMember {
  /**
   * Public member profile summary for list displays and profile browsing.
   *
   * Contains essential public information about a registered member including their unique username, display name, optional biographical text, optional avatar image URL, karma reputation score, and account creation timestamp. This schema is optimized for member discovery and public profile viewing.
   *
   * Sensitive authentication fields like {@link email} and {@link password_hash} are intentionally excluded. The {@link bio} and {@link avatar} fields are optional and may be null if the member has not set them. The {@link karma} score reflects the member's reputation based on votes received on their posts and comments.
   */
  export type ISummary = {
    id: string & tags.Format<"uuid">;
    username: string;
    display_name: string;
    bio: string | null;
    avatar: string | null;
    karma: number & tags.Type<"int32">;
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for browsing and searching member accounts.
   *
   * This type defines optional filter criteria, pagination, and sorting options for retrieving a paginated list of member accounts. All fields are optional - clients can browse without filters or apply specific search criteria.
   *
   * Search filters enable partial matching on username and display name, range filtering on karma scores, and date range filtering on account creation timestamps. Pagination controls result set size and page navigation. Sorting configures the order of results by various fields.
   */
  export type IRequest = {
    /**
     * Partial match filter for username search.
     *
     * When provided, returns only members whose username contains the specified text. Comparison is case-insensitive using ILIKE operator.
     *
     * Example: 'john' matches 'john_doe', 'JohnSmith', 'myjohnny'.
     *
     * @x-autobe-specification Query parameter for filtering reddit_community_members.username using ILIKE partial match. Repository applies: WHERE username ILIKE '%{username}%'. Maps to username column for case-insensitive search.
     */
    username?: string | undefined;

    /**
     * Partial match filter for display name search.
     *
     * When provided, returns only members whose display name contains the specified text. Comparison is case-insensitive using ILIKE operator.
     *
     * Example: 'John' matches 'John Doe', 'Johnny', 'My John'.
     *
     * @x-autobe-specification Query parameter for filtering reddit_community_members.display_name using ILIKE partial match. Repository applies: WHERE display_name ILIKE '%{displayName}%'. Maps to display_name column for case-insensitive search.
     */
    displayName?: string | undefined;

    /**
     * Minimum karma score filter.
     *
     * When provided, returns only members with karma greater than or equal to this value. Useful for finding established users with significant reputation.
     *
     * Karma represents the sum of upvotes minus downvotes received on a user's posts and comments.
     *
     * @x-autobe-specification Query parameter for filtering reddit_community_members.karma with >= comparison. Repository applies: WHERE karma >= {karmaMin}. Maps to karma column for minimum reputation threshold.
     */
    karmaMin?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum karma score filter.
     *
     * When provided, returns only members with karma less than or equal to this value. Can be combined with karmaMin for range queries.
     *
     * Karma represents the sum of upvotes minus downvotes received on a user's posts and comments.
     *
     * @x-autobe-specification Query parameter for filtering reddit_community_members.karma with <= comparison. Repository applies: WHERE karma <= {karmaMax}. Maps to karma column for maximum reputation threshold.
     */
    karmaMax?: (number & tags.Type<"int32">) | undefined;

    /**
     * Registration date lower bound filter.
     *
     * When provided, returns only members who registered after this timestamp. Uses ISO 8601 datetime format (e.g., '2024-01-01T00:00:00Z').
     *
     * Useful for finding new users or filtering by registration period.
     *
     * @x-autobe-specification Query parameter for filtering reddit_community_members.created_at with >= comparison. Repository applies: WHERE created_at >= {createdAfter}. ISO 8601 datetime format. Maps to created_at column for registration date lower bound.
     */
    createdAfter?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Registration date upper bound filter.
     *
     * When provided, returns only members who registered before this timestamp. Uses ISO 8601 datetime format (e.g., '2024-01-01T00:00:00Z').
     *
     * Can be combined with createdAfter for date range queries.
     *
     * @x-autobe-specification Query parameter for filtering reddit_community_members.created_at with <= comparison. Repository applies: WHERE created_at <= {createdBefore}. ISO 8601 datetime format. Maps to created_at column for registration date upper bound.
     */
    createdBefore?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination.
     *
     * Specifies which page of results to retrieve. Page numbering starts at 1 (first page). Must be at least 1.
     *
     * Combined with limit to control result set pagination. For example, page=2 with limit=20 returns items 21-40.
     *
     * @x-autobe-specification Pagination parameter - no direct DB mapping. Repository calculates OFFSET as (page - 1) * limit. Minimum value is 1, defaults to 1 if not provided.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page.
     *
     * Controls how many member records are returned in a single response. Must be between 1 and 100 inclusive.
     *
     * Larger limits reduce the number of API calls needed but increase response size. Consider performance implications when setting high values.
     *
     * @x-autobe-specification Pagination parameter - no direct DB mapping. Repository applies LIMIT clause. Value must be between 1 and 100 inclusive. Defaults to 20 if not provided.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by.
     *
     * Determines which member attribute controls the ordering of results. Valid values are:
     *
     * - 'username': Alphabetical order by username
     * - 'karma': Numerical order by karma score
     * - 'created_at': Chronological order by registration date
     *
     * Combined with direction to control ascending or descending order.
     *
     * @x-autobe-specification Sorting parameter - no direct DB mapping but values reference DB columns. Repository applies ORDER BY clause using: 'username' → username, 'karma' → karma, 'created_at' → created_at. Defaults to 'created_at' if not provided.
     */
    sort?: "username" | "karma" | "created_at" | undefined;

    /**
     * Sort direction for results.
     *
     * Controls whether results are ordered in ascending or descending order based on the sort field.
     *
     * - 'asc': Ascending order (A-Z, 0-9, oldest-first)
     * - 'desc': Descending order (Z-A, 9-0, newest-first)
     *
     * Common patterns: sort='created_at' with direction='desc' shows newest members first.
     *
     * @x-autobe-specification Sorting direction parameter - no direct DB mapping. Repository applies ASC or DESC to ORDER BY clause. Valid values: 'asc' (ascending), 'desc' (descending). Defaults to 'desc' if not provided.
     */
    direction?: "asc" | "desc" | undefined;
  };

  /**
   * Registration credentials for creating a new member account.
   *
   * Contains the email address, plain text password, and chosen username required for new member registration. The email must be unique across all members and follow standard email format. The password is provided in plain text and will be bcrypt hashed by the backend before storage. The username must be unique and is used for public identification and mentions.
   *
   * Session context fields (href, referrer, ip) track the registration source for security monitoring and analytics. The href and referrer capture the user's navigation context from request headers, while ip records the client's network address when available.
   */
  export type IJoin = {
    /**
     * The user's email address for account authentication and recovery.
     *
     * Used as the primary login credential along with the password. Must be unique across all member accounts. Also used for password reset requests and email verification flows. The email is stored in plain text and must follow standard email format (RFC 5322).
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_members.email. Unique constraint enforced. Validated for email format before storage.
     */
    email: string & tags.Format<"email">;

    /**
     * The user's plain text password for authentication.
     *
     * Provided in plain text during registration and login. The backend bcrypt hashes this password before storing it in the database. Password strength is validated to ensure minimum security requirements (length, character variety). Never exposed in any response DTO.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to reddit_community_members.password_hash. Plain text password from request is bcrypt hashed before storage. Password strength validated (minimum length, complexity requirements) before hashing.
     */
    password: string & tags.Format<"password">;

    /**
     * The user's unique username for public identification.
     *
     * Chosen by the user during registration and used to display author names on posts and comments. Supports user mentions using @username syntax. Must be unique across all member accounts and cannot be changed after registration.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from reddit_community_members.username. Unique constraint enforced. Used for public identification and @mentions.
     */
    username: string;

    /**
     * The URL of the page where the user initiated registration.
     *
     * Captured from the request headers for security monitoring and analytics purposes. Helps track user navigation patterns and detect suspicious registration sources. May be omitted in server-side rendering (SSR) scenarios where the client cannot determine this value.
     *
     * @x-autobe-specification Captured from request headers (Referer or custom header). Not stored in reddit_community_members table. Used for analytics and fraud detection. Optional in SSR scenarios where client cannot determine href.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referring URL that directed the user to the registration page.
     *
     * Captured from the HTTP Referer header for analytics and attribution tracking. Helps identify traffic sources and marketing campaign effectiveness. May be omitted if the user typed the URL directly or if the browser does not send the Referer header.
     *
     * @x-autobe-specification Captured from request headers (Referer header). Not stored in reddit_community_members table. Used for analytics and attribution tracking. Optional in SSR scenarios.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * The client's IP address at registration time.
     *
     * Captured from the request context for security monitoring, fraud detection, and rate limiting. Stored in the session record rather than the member table to track authentication context. Optional because in server-side rendering (SSR) scenarios, the client cannot know its own IP address—the server captures it as a fallback.
     *
     * @x-autobe-specification Captured from request context (X-Forwarded-For header or direct connection IP). Not stored in reddit_community_members table. Stored in reddit_community_member_sessions for session tracking. Optional (format: ipv4) because in SSR the server captures it as fallback.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Login credentials for member authentication.
   *
   * Contains the email and password required to authenticate a member account, along with session context information for tracking the login request. The email must match an existing member account, and the password is validated against the stored bcrypt hash.
   *
   * The session context fields (href, referrer, ip) capture the request origin for security auditing and session management purposes. These fields are used to create the initial session record and are stored in the reddit_community_member_sessions table.
   */
  export type ILogin = {
    /**
     * Email address for member authentication.
     *
     * The email address associated with the member account. This field is used to identify and authenticate the user during login. The email must match an existing account in the reddit_community_members table.
     *
     * The email format is validated according to RFC 5322 standards. The lookup uses the unique index on the email column for efficient retrieval.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_members.email. Used to lookup member account. Must match unique email constraint. Format validated as RFC 5322 email address.
     */
    email: string & tags.Format<"email">;

    /**
     * Password for member authentication.
     *
     * The user's password in plain text, which is validated against the stored bcrypt hash in the database. The password is never stored or logged - it is only used for authentication comparison.
     *
     * The password is compared using bcrypt's secure comparison algorithm to prevent timing attacks. Minimum password requirements (length, complexity) are enforced during registration, not login.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to reddit_community_members.password_hash. Plain text password from request is hashed using bcrypt and compared against stored hash. Never stored or logged in plain text. Comparison uses constant-time algorithm to prevent timing attacks.
     */
    password: string & tags.Format<"password">;

    /**
     * URL of the page where the login request originated.
     *
     * Captured from the HTTP request for session tracking and security auditing. This field helps identify the context of the login attempt and is stored in the session record for security monitoring.
     *
     * The href is extracted from the request's Referrer or Origin header and should be a valid URI format.
     *
     * @x-autobe-specification Session context field captured from HTTP request. Not stored in reddit_community_members - captured from request headers and stored in reddit_community_member_sessions for audit trail. Required field for login requests.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the source page that initiated the login request.
     *
     * Captured from the HTTP request's Referrer header for session tracking and security auditing. This field provides additional context about the user's navigation path leading to authentication.
     *
     * The referrer is optional in some browsers due to privacy settings but is required for security audit completeness.
     *
     * @x-autobe-specification Session context field captured from HTTP request. Not stored in reddit_community_members - captured from request headers and stored in reddit_community_member_sessions for audit trail. Required field for login requests.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * IP address of the client making the login request.
     *
     * Captured from the HTTP request for session tracking, security auditing, and rate limiting. The IP address helps identify suspicious login patterns and is used for brute force attack prevention.
     *
     * This field is optional in the request body as the server can extract the IP address from the request headers if not explicitly provided. Format is IPv4 address.
     *
     * @x-autobe-specification Session context field captured from HTTP request. Not stored in reddit_community_members - captured from request and stored in reddit_community_member_sessions for audit trail. Optional field (not in required array) as server can capture IP from request if not provided.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Authentication response containing JWT tokens and member profile information.
   *
   * Returned upon successful member registration, login, or token refresh. Contains the JWT access_token and refresh_token pair along with token expiration timestamp. The token object enables authenticated API calls - access_token is used for authorization headers, refresh_token is used to obtain new token pairs before expiration.
   *
   * Includes member profile information: id for user identification, email for account reference, username for public identification, display_name for profile display, bio and avatar for profile customization, and karma score representing user reputation. All member fields reflect the current state at authentication time.
   */
  export type IAuthorized = {
    id: string & tags.Format<"uuid">;
    email: string & tags.Format<"email">;
    username: string;
    display_name: string;
    bio: string | null;
    avatar: string | null;
    karma: number & tags.Type<"int32">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for refreshing authentication tokens.
   *
   * Contains the refresh_token used to obtain a new access and refresh token pair. The refresh_token is validated against the reddit_community_member_sessions table to ensure it exists, is unique, and the session has not expired. The associated member account must be active (deleted_at is null).
   *
   * Upon successful validation, a new JWT access_token and refresh_token pair is generated and the session record is updated with the new tokens and extended expired_at timestamp.
   */
  export type IRefresh = {
    /**
     * Refresh token for obtaining new access and refresh token pair.
     *
     * This token is validated against the reddit_community_member_sessions table to ensure it exists and is unique. The associated session must not have expired (expired_at must be in the future) and the member account must be active (deleted_at is null).
     *
     * Upon successful validation, the server generates a new JWT access_token and refresh_token pair, updates the session record with the new tokens and extended expiration timestamp, and returns them in the response.
     *
     * @x-autobe-database-schema-property refresh_token
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.refresh_token. Client provides this token to request new access/refresh token pair. Backend validates token exists, is unique, session not expired, and member account is active.
     */
    refresh_token: string;
  };
}
