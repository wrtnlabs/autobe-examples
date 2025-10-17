import { tags } from "typia";

export namespace IEconDiscussVisitorJoin {
  /**
   * Visitor registration payload.
   *
   * Creates a base identity row in Actors.econ_discuss_users (email,
   * password_hash ← derived from password, display_name, optional avatar_uri,
   * timezone, locale; email_verified=false; mfa_enabled=false) and assigns a
   * Visitor role via Actors.econ_discuss_visitors. Timestamps (created_at,
   * updated_at) are managed by the service.
   *
   * Security: Accepts plaintext password only for hashing. Never accept or
   * expose password_hash, mfa_secret, or mfa_recovery_codes in requests.
   */
  export type ICreate = {
    /**
     * User's unique email address for authentication and notifications.
     *
     * Maps to econ_discuss_users.email in the Actors schema. The Prisma
     * model enforces uniqueness via @@unique([email]).
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password submitted by the client for account creation. The
     * backend MUST hash this value into econ_discuss_users.password_hash;
     * plaintext is never persisted.
     *
     * Security: Do not log or echo this value. Hashing occurs server-side
     * before storage.
     */
    password: string & tags.MinLength<8>;

    /**
     * Publicly visible display name/handle for the account.
     *
     * Maps to econ_discuss_users.display_name in the Actors schema.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<120>;

    /**
     * Preferred IANA timezone identifier used for notifications, digests,
     * and scheduling (e.g., "Asia/Seoul").
     *
     * Maps to econ_discuss_users.timezone in the Actors schema.
     */
    timezone?: string | undefined;

    /**
     * Preferred BCP 47 locale tag for UI and communications (e.g.,
     * "en-US").
     *
     * Maps to econ_discuss_users.locale in the Actors schema.
     */
    locale?: string | undefined;

    /**
     * Optional avatar image URI for the profile. Validate maximum length
     * and URI format at application level.
     *
     * Maps to econ_discuss_users.avatar_uri in the Actors schema.
     */
    avatar_uri?: (string & tags.Format<"uri">) | undefined;
  };
}
