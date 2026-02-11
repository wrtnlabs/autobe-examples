import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCommunityCommunityModerator {
  /**
   * JWT refresh token used to obtain a new access token without requiring re-authentication. Must be a valid, unrevoked token previously issued to this community moderator.
   */
  export type IRefresh = {
    /**
     * JWT refresh token used to obtain a new access token without requiring re-authentication. Must be a valid, unrevoked token previously issued to this community moderator.
     *
     * @x-autobe-specification Direct mapping from reddit_community_community_moderator_sessions.refresh_token_hash field. The refresh_token string sent in this DTO is hashed and compared against the stored hash. If matching and not expired or revoked (deleted_at is null), a new access_token and optionally new refresh_token are issued. This is a stateless authentication flow using JWT tokens without exposing internal session IDs or user identifiers.
     */
    refresh_token: string;
  };

  /**
   * Authentication request payload for community moderators. Contains the email and plain-text password used to establish a session. The password is hashed server-side and compared against the stored hash in the database.
   */
  export type ILogin = {
    /**
     * The email address associated with the community moderator account. Must be a valid email format.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_community_moderators.email. Used to identify the user during authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * The unhashed plain text password for authentication. This value is transmitted securely and hashed server-side before comparison with the stored password_hash.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Direct mapping from reddit_community_community_moderators.password_hash. This field contains the unhashed plain text password that will be compared server-side against the stored hash using bcrypt.compare.
     */
    password: string;
  };

  /**
   * Authentication response containing JWT access and refresh tokens for stateless API authorization. After successful authentication, the client receives this payload to include in subsequent API requests via the Authorization header.
   */
  export type IAuthorized = {
    /**
     * Short-lived JWT access token used for authenticating API requests. Expires in 15 minutes and must be refreshed using the refresh token after expiration.
     *
     * @x-autobe-specification JWT access token issued by authentication server. Signed with secret key and contains claims including actor ID, roles, and expiration time. Must be included in Authorization header as 'Bearer {access_token}' for authenticated requests.
     */
    access_token: string;

    /**
     * Long-lived JWT refresh token used to obtain new access tokens without requiring the user to re-enter credentials. Valid for 7 days and must be stored securely.
     *
     * @x-autobe-specification JWT refresh token issued by authentication server. Used to request new access_tokens without re-authentication. Stored hash in reddit_community_community_moderator_sessions with expiration time of 7 days. Must be transmitted securely only to the refresh endpoint.
     */
    refresh_token: string;

    /**
     * Number of seconds until the access_token expires. Client should refresh the token before this time elapses to maintain seamless user experience.
     *
     * @x-autobe-specification Computed value representing the remaining seconds until the access_token expires. Calculated as (access_token.exp - now). Typically 900 seconds (15 minutes). This field is not stored in the database—it is derived from the JWT's 'exp' claim.
     */
    expires_in: number & tags.Type<"int32">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Registration payload for creating a new community moderator account. Contains required authentication credentials and optional display name for user identification.
   */
  export type IJoin = {
    /**
     * The user's email address used for account registration and authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_community_moderators.email. Must be unique and serve as the primary authentication identifier.
     */
    email: string & tags.Format<"email">;

    /**
     * Hashed password for authentication. Must be pre-hashed by the client using bcrypt before submission.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Direct mapping from reddit_community_community_moderators.password_hash. Client must provide a bcrypt-hashed password with cost 12 or higher. Plain text passwords are never accepted.
     */
    password_hash: string;

    /**
     * Public-facing name displayed on posts and comments. Optional during registration; can be updated after email verification.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from reddit_community_community_moderators.display_name. Optional field; if not provided, the system will use a default display name based on email prefix or allow user to set later.
     */
    display_name?: string | undefined;
  };

  /**
   * A lightweight summary of a community moderator, displaying only their public identity information for moderation interfaces. Includes display name, optional bio, avatar URL, and creation date. Used in audit logs, ban records, and moderation actions to identify the moderator with minimal personal data.
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
     * Optional biography or profile description of the moderator.
     *
     * @x-autobe-database-schema-property bio
     * @x-autobe-specification Maps to nullable bio column in reddit_community_community_moderators. Allows null when moderator chooses not to provide bio.
     */
    bio?: string | null | undefined;

    /**
     * URL to the moderator's avatar image, may be null.
     *
     * @x-autobe-database-schema-property avatar_url
     * @x-autobe-specification Maps to nullable avatar_url column in reddit_community_community_moderators. Allows null when moderator has not uploaded an avatar.
     */
    avatar_url?: string | null | undefined;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;
  };
}
