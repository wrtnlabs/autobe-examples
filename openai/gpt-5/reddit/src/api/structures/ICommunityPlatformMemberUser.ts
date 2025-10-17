import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformMemberUser {
  /**
   * Member registration request body for POST /auth/memberUser/join.
   *
   * This DTO maps to the Actors core identity model community_platform_users
   * for creation-time fields and follows the schema comments: store only
   * password_hash (derived from the provided password), enforce unique email
   * and username, capture consent timestamps, and initialize lifecycle flags
   * (email_verified, account_state) server-side.
   *
   * Security: Do not accept system-managed fields such as id, created_at,
   * updated_at, or deleted_at from clients. Actor IDs and ownership fields
   * are derived from authentication context, not client input.
   */
  export type ICreate = {
    /**
     * Unique email used as a primary login identifier.
     *
     * Prisma column: community_platform_users.email. A unique index
     * enforces case-insensitive uniqueness at the database level per
     * deployment. Must be a valid email address.
     */
    email: string & tags.Format<"email">;

    /**
     * Public handle shown in profiles and used in mentions. Must be unique
     * across the platform.
     *
     * Prisma column: community_platform_users.username. Business rule: 3–20
     * characters; letters, digits, and underscores only.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[A-Za-z0-9_]{3,20}$">;

    /**
     * Plaintext password provided at registration. The backend MUST hash
     * this into community_platform_users.password_hash and MUST NOT store
     * plaintext.
     *
     * Policy (business requirements): 8–64 characters, at least one letter
     * and one number; reject commonly breached passwords.
     */
    password: string &
      tags.MinLength<8> &
      tags.MaxLength<64> &
      tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d\\S]{8,64}$">;

    /**
     * Timestamp when Terms of Service were accepted.
     *
     * Prisma column: community_platform_users.terms_accepted_at
     * (timestamptz). Recorded for compliance and audit.
     */
    terms_accepted_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the Privacy Policy was accepted.
     *
     * Prisma column: community_platform_users.privacy_accepted_at
     * (timestamptz). Recorded for compliance and audit.
     */
    privacy_accepted_at: string & tags.Format<"date-time">;

    /**
     * Whether the user explicitly opts into marketing communications.
     *
     * Prisma column: community_platform_users.marketing_opt_in (Boolean).
     * When true, providers should stamp marketing_opt_in_at server-side.
     * When omitted or false, default handling should record a false value
     * in the database.
     */
    marketing_opt_in?: boolean | undefined;
  };

  /**
   * Authorization response for a Member user.
   *
   * This DTO is returned after successful authentication flows
   * (join/login/refresh) for a member-capable identity stored in
   * Actors.community_platform_users. It purposely excludes sensitive fields
   * like password_hash and email while providing basic public profile context
   * and the issued JWT token bundle.
   *
   * Security note: The token is provided via the standard IAuthorizationToken
   * component. The included properties (id, username, display_name,
   * avatar_uri, email_verified, account_state) mirror non-sensitive columns
   * documented in the Prisma model for community_platform_users to support
   * client rendering and capability gating.
   */
  export type IAuthorized = {
    /**
     * Primary key from Actors.community_platform_users.id.
     *
     * This identifier uniquely represents the authenticated member user
     * account within the platform and is used for all subsequent
     * authorization and ownership relations.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public handle from Actors.community_platform_users.username.
     *
     * This value is globally unique across the platform and is commonly
     * used for profile URLs and mentions, as described in the Prisma schema
     * comments.
     */
    username?: string | undefined;

    /**
     * Optional display name from
     * Actors.community_platform_users.display_name.
     *
     * When present, this is a mutable, user-chosen label for profile
     * presentation. It is not guaranteed to be unique.
     */
    display_name?: string | undefined;

    /**
     * Optional avatar URI from Actors.community_platform_users.avatar_uri.
     *
     * Represents a public-facing image resource location used by clients to
     * render user avatars. The database column allows up to 80,000
     * characters.
     */
    avatar_uri?: (string & tags.MaxLength<80000>) | undefined;

    /**
     * Email verification flag from
     * Actors.community_platform_users.email_verified.
     *
     * When true, the account has completed verification and may unlock
     * participation features according to business policy.
     */
    email_verified?: boolean | undefined;

    /**
     * Lifecycle state from Actors.community_platform_users.account_state
     * (e.g., PendingVerification, Active, Locked, Deactivated,
     * PendingDeletion, Deleted, Banned).
     *
     * Downstream services use this value to gate capabilities at
     * login/refresh time and for security decisions.
     */
    account_state?: string | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /** Member login payload. Provide either email or username plus password. */
  export type ILogin = {
    /** Login using email (mutually exclusive with username). */
    email?: (string & tags.Format<"email">) | null | undefined;

    /** Login using username (mutually exclusive with email). */
    username?: string | null | undefined;

    /** Plain password for verification. */
    password: string;
  };

  /** Member refresh request payload. */
  export type IRefresh = {
    /** Refresh token to renew member authorization. */
    refresh_token: string;
  };
}
