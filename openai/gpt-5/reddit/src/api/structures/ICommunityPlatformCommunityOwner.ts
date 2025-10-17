import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformCommunityOwner {
  /**
   * Community Owner registration request used by POST
   * /auth/communityOwner/join.
   *
   * This DTO maps to the Actors core identity model community_platform_users
   * for fields that are user-provided at registration. The server sets
   * system-managed fields such as id, created_at, updated_at, email_verified,
   * account_state, and deleted_at and hashes the supplied password into
   * password_hash before persistence, in accordance with Prisma comments.
   *
   * Security and compliance: do not accept identifiers like id or system
   * timestamps from clients. The password field is accepted only to derive
   * password_hash; plaintext is never stored. Business rules enforce
   * uniqueness for email and username and require consent timestamps for
   * Terms and Privacy.
   */
  export type ICreate = {
    /**
     * Unique email address for the account
     * (community_platform_users.email).
     *
     * The Prisma schema enforces uniqueness (@@unique) and serves as a
     * primary login identifier. Stored as a string and used for
     * verification workflows and notifications.
     */
    email: string & tags.Format<"email">;

    /**
     * Public handle for the account (community_platform_users.username).
     *
     * Must be unique platform-wide per Prisma @@unique. Allowed characters:
     * letters, numbers, and underscores per business rules.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[A-Za-z0-9_]{3,20}$">;

    /**
     * Plaintext password to be hashed into
     * community_platform_users.password_hash by the server.
     *
     * Security: clients MUST NOT send pre-hashed values. The backend
     * derives a non-reversible password_hash and never persists plaintext.
     * This field does not exist in Prisma and is used only to compute
     * password_hash.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<64>;

    /**
     * Optional profile display name mapped to
     * community_platform_users.display_name.
     *
     * Purely presentational and may be edited later per policy.
     */
    display_name?: string | undefined;

    /**
     * Optional avatar URI mapped to community_platform_users.avatar_uri.
     *
     * Stored as a string (VarChar) in Prisma; providers may validate
     * allowed schemes and size constraints.
     */
    avatar_uri?: (string & tags.Format<"uri">) | undefined;

    /**
     * Timestamp when Terms of Service were accepted
     * (community_platform_users.terms_accepted_at).
     *
     * Required for compliance and audit; stored as timestamptz.
     */
    terms_accepted_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when Privacy Policy was accepted
     * (community_platform_users.privacy_accepted_at).
     *
     * Required for compliance and audit; stored as timestamptz.
     */
    privacy_accepted_at: string & tags.Format<"date-time">;

    /**
     * Whether the user explicitly opted in to marketing communications
     * (community_platform_users.marketing_opt_in).
     *
     * Optional at registration; defaults are defined by business policy.
     */
    marketing_opt_in?: boolean | undefined;

    /**
     * Timestamp when marketing opt-in was granted
     * (community_platform_users.marketing_opt_in_at).
     *
     * Optional; when provided, must be a valid timestamptz per schema
     * comments.
     */
    marketing_opt_in_at?: (string & tags.Format<"date-time">) | undefined;
  };

  /** Authorization response for community owner with JWT token information. */
  export type IAuthorized = {
    /** Authenticated user id. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /** Role kind for the session. */
    role?: "communityOwner" | undefined;
  };

  /**
   * Login request for Community Owner accounts.
   *
   * Allows authentication by either email or username along with a plaintext
   * password. The backend validates credentials against
   * community_platform_users.password_hash and applies account_state and
   * email_verified gates. No x-autobe-prisma-schema linkage because this is a
   * request wrapper and includes a plaintext password field.
   */
  export type ILogin = any | any;

  /** Community owner refresh request payload. */
  export type IRefresh = {
    /** Refresh token to renew owner session. */
    refresh_token: string;
  };

  /** Email verification confirmation payload. */
  export type IVerifyEmail = {
    /** One-time verification artifact to confirm email ownership. */
    verification_token: string;
  };

  /** Password change request for authenticated community owner. */
  export type IChangePassword = {
    /** Current credential for verification. */
    current_password: string;

    /** New credential to set after validation. */
    new_password: string;
  };
}
