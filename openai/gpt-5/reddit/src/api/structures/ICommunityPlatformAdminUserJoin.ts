import { tags } from "typia";

export namespace ICommunityPlatformAdminUserJoin {
  /**
   * Admin registration request body.
   *
   * This DTO creates a core identity in community_platform_users and grants
   * admin privileges in a separate table. Fields map to the Prisma model
   * columns per the Actors schema comments: unique email and username,
   * password captured in plaintext here but stored as a non-reversible hash
   * (password_hash), and required consent timestamps (terms_accepted_at,
   * privacy_accepted_at). Optional marketing preferences can be recorded
   * using marketing_opt_in and marketing_opt_in_at.
   *
   * Security and business rules: plaintext password must never be stored;
   * backend hashes to community_platform_users.password_hash. Email
   * verification (community_platform_users.email_verified) and account_state
   * are set server-side per onboarding policy and are not part of this
   * request.
   */
  export type ICreate = {
    /**
     * Unique email address for the new administrator account.
     *
     * Prisma column mapping: community_platform_users.email. The Prisma
     * model enforces uniqueness via @@unique([email]). Values are
     * case-insensitive by business policy even if stored as text. This
     * field is used for login and for sending verification and security
     * notifications.
     */
    email: string & tags.Format<"email">;

    /**
     * Public handle for the administrator, unique platform-wide. Allowed
     * characters are letters, numbers, and underscore only; 3–20
     * characters.
     *
     * Prisma column mapping: community_platform_users.username. The Prisma
     * model enforces uniqueness via @@unique([username]). Used for profile
     * URLs and mentions.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[A-Za-z0-9_]{3,20}$">;

    /**
     * Plaintext password supplied by the client for credential setup. The
     * backend MUST hash this value into
     * community_platform_users.password_hash before storage. Do not persist
     * plaintext.
     *
     * Security and validation: 8–64 characters, require at least one letter
     * and one number. Backends may apply additional strength checks. Prisma
     * column reference for the hashed value:
     * community_platform_users.password_hash.
     */
    password: string &
      tags.MinLength<8> &
      tags.MaxLength<64> &
      tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d)[\\s\\S]{8,64}$">;

    /**
     * Timestamp when Terms of Service were accepted by the registrant.
     *
     * Prisma column mapping: community_platform_users.terms_accepted_at
     * (Timestamptz). Required for compliance and audit trails.
     */
    terms_accepted_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when Privacy Policy was accepted by the registrant.
     *
     * Prisma column mapping: community_platform_users.privacy_accepted_at
     * (Timestamptz). Required for compliance and audit trails.
     */
    privacy_accepted_at: string & tags.Format<"date-time">;

    /**
     * Whether the registrant explicitly opted in to marketing
     * communications.
     *
     * Prisma column mapping: community_platform_users.marketing_opt_in.
     * Optional; defaults to false at the application layer when not
     * provided.
     */
    marketing_opt_in?: boolean | undefined;

    /**
     * Timestamp when marketing opt-in was granted. Provide only when
     * marketing_opt_in is true.
     *
     * Prisma column mapping: community_platform_users.marketing_opt_in_at
     * (Timestamptz). Optional; null when not opted in.
     */
    marketing_opt_in_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
