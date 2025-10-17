import { tags } from "typia";

export namespace ICommunityPlatformCommunityModeratorJoin {
  /**
   * Registration request body for a user intending to become a community
   * moderator (member-kind role).
   *
   * On success, the service creates a row in Actors.community_platform_users
   * using the supplied identifiers and consents, hashing the provided
   * password into password_hash, initializing lifecycle flags (e.g.,
   * email_verified=false, account_state="PendingVerification"), and setting
   * created_at/updated_at. It may also create a membership row in
   * Actors.community_platform_member_users to enable participant
   * capabilities, per business rules. Prisma schema comments emphasize unique
   * constraints on email and username and the use of Timestamptz for consent
   * timestamps.
   *
   * Security note: plaintext password is accepted only for hashing; the
   * stored field is password_hash. System-managed fields like id, created_at,
   * updated_at, and deleted_at are not accepted in this client DTO.
   */
  export type ICreate = {
    /**
     * Unique email address for the new account.
     *
     * Maps to Actors.community_platform_users.email. The Prisma model
     * enforces uniqueness via @@unique([email]). Case-insensitive
     * uniqueness is recommended in implementation. Used as a primary login
     * identifier.
     */
    email: string & tags.Format<"email">;

    /**
     * Public handle for the user (3–20 characters; letters, numbers,
     * underscores).
     *
     * Maps to Actors.community_platform_users.username, which must be
     * unique (@@unique([username])). This value is used in profile URLs and
     * mentions; prefer case-insensitive uniqueness at the database level as
     * noted in the Prisma comments.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[A-Za-z0-9_]{3,20}$">;

    /**
     * Plaintext password provided for registration; never stored directly.
     *
     * The service hashes this into
     * Actors.community_platform_users.password_hash before persistence, per
     * Prisma schema guidance. Must meet strength rules (>= 1 letter and >=
     * 1 number; 8–64 characters).
     */
    password: string &
      tags.MinLength<8> &
      tags.MaxLength<64> &
      tags.Pattern<"(?=.*[A-Za-z])(?=.*\\d).{8,64}">;

    /**
     * Timestamp when Terms of Service were accepted.
     *
     * Persists to Actors.community_platform_users.terms_accepted_at
     * (Timestamptz). Required for compliance and audit per the Prisma
     * schema comments.
     */
    terms_accepted_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the Privacy Policy was accepted.
     *
     * Persists to Actors.community_platform_users.privacy_accepted_at
     * (Timestamptz). Required for compliance and audit per the Prisma
     * schema comments.
     */
    privacy_accepted_at: string & tags.Format<"date-time">;

    /**
     * Whether the registrant explicitly opted in to marketing
     * communications.
     *
     * Maps to Actors.community_platform_users.marketing_opt_in. If true,
     * providers should set marketing_opt_in_at accordingly.
     */
    marketing_opt_in?: boolean | undefined;

    /**
     * Timestamp when marketing opt-in was granted.
     *
     * Maps to Actors.community_platform_users.marketing_opt_in_at
     * (Timestamptz). Typically set only when marketing_opt_in is true;
     * otherwise may be omitted.
     */
    marketing_opt_in_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
