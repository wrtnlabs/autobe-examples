import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCommunityPlatformAdmin {
  /**
   * A JWT refresh token used to obtain a new access token when the current one expires. This token is issued during authentication and must be presented in the request body to renew the session. It is long-lived (typically 7 days) but revocable, ensuring security without frequent re-authentication. The token itself is opaque to the client and must be transmitted as a plain string.
   */
  export type IRefresh = {
    /**
     * A JWT refresh token used to obtain a new access token when the current one expires. This token is issued during authentication and must be presented in the request body to renew the session. It is long-lived (typically 7 days) but revocable, ensuring security without frequent re-authentication. The token itself is opaque to the client and must be transmitted as a plain string.
     *
     * @x-autobe-specification This JWT refresh token is extracted and validated cryptographically. The server checks if the token's signature is valid and checks its presence in the reddit_community_token_revocations table. If present, the token has been revoked and access is denied. If absent, the token is valid and a new session is generated. This field is the sole source of authentication for the refresh operation. The mapping to reddit_community_token_revocations.token is handled in service code, not schema.
     */
    refresh_token: string;
  };

  /**
   * Request body for registering a new platform administrator account. Contains the email address and plaintext password required for account creation. Email must conform to RFC 5322 standards and be unique across the system. Password must be at least 12 characters and include uppercase, lowercase, digit, and special character for security compliance. No profile fields (display name, bio, avatar) are accepted here—they are set after registration via user profile update.
   */
  export type IJoin = {
    /**
     * User's email address for account registration. Must be unique across the entire platform. Used as primary login identifier.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from request to reddit_community_platform_admins.email. Must conform to RFC 5322 syntax. Service layer enforces uniqueness against both platform_admins and members tables.
     */
    email: string & tags.Format<"email">;

    /**
     * User's plaintext password for account creation. Minimum 12 characters, must include uppercase, lowercase, digit, and special character. Never exposed or stored—automatically hashed during registration.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plaintext password from request is hashed using bcrypt with cost 12 before storage in reddit_community_platform_admins.password_hash. Minimum 12 characters required, with uppercase, lowercase, digit, and special character. Never stored or returned as plaintext. Transformation is mandatory and performed by service layer before DB persistence.
     */
    password: string & tags.MinLength<12>;
  };

  /**
   * Request body for authenticating a platform administrator. Contains only the email address and plaintext password used to verify identity against the platform admin account database. No user metadata, tokens, or session information should be included in this request. This is a pure credential-based login operation.
   */
  export type ILogin = {
    /**
     * Email address used for platform administrator login. Must match a verified account in the database.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_platform_admins.email. Case-insensitive lookup during authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password provided by the administrator for authentication. This value is not persisted; it is used for one-time bcrypt comparison against the stored password hash.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Client sends plaintext password. Server hashes using bcrypt.compare against stored password_hash in reddit_community_platform_admins. Never stored or logged in plaintext.
     */
    password: string;
  };

  /**
   * Contains the JWT authentication tokens issued to a platform administrator upon successful login, join, or refresh. Includes both the short-lived access token used for API authorization and the long-lived refresh token used to obtain new access tokens. The expired_at field indicates when the access token will expire, allowing the client to proactively request a refresh before expiration.
   */
  export type IAuthorized = {
    /**
     * Short-lived JSON Web Token used for authenticating API requests.
     *
     * @x-autobe-specification JWT access token issued by service layer. Generated using HS256 signature and system secret. Expires in 15 minutes. Must be included in Authorization header as Bearer token for authenticated endpoints.
     */
    access: string;

    /**
     * Long-lived JSON Web Token used to obtain new access tokens when they expire.
     *
     * @x-autobe-specification JWT refresh token issued by service layer. Generated using HS256 signature and system secret. Expires in 7 days. Used exclusively with /refresh endpoint to obtain new access tokens. Must be stored securely on client.
     */
    refresh: string;

    /**
     * ISO 8601 timestamp indicating when the access token expires.
     *
     * @x-autobe-specification ISO 8601 formatted timestamp derived from the exp claim of the access token. Represents the exact moment when access token becomes invalid. Clients should proactively refresh when remaining validity is under 5 minutes.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Lightweight public profile summary of a platform administrator. Contains essential display information for audit log actor identification. Excludes sensitive and internal information such as email, password hashes, or session data. Designed for display in security audit trails and system monitoring contexts.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property display_name
     */
    display_name: string;

    /**
     * Optional bio text of the platform admin. May be null if not provided.
     *
     * @x-autobe-database-schema-property bio
     */
    bio: string | null;

    /**
     * Optional URL to the platform admin's avatar image. May be null if not set.
     *
     * @x-autobe-database-schema-property avatar_url
     */
    avatar_url: string | null;
    /**
     * @x-autobe-database-schema-property karma
     */
    karma: number & tags.Type<"int32">;
  };
}
