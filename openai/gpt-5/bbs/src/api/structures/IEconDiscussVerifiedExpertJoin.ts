import { tags } from "typia";

export namespace IEconDiscussVerifiedExpertJoin {
  /**
   * Verified Expert registration request DTO for creating a base identity row
   * in econ_discuss_users.
   *
   * Upon success, the backend persists required columns (email, password_hash
   * derived from password, display_name) and optional preferences (timezone,
   * locale, avatar_uri). System flags are initialized per policy:
   * email_verified=false, mfa_enabled=false, and secret/recovery fields
   * remain null.
   *
   * SECURITY: This request MUST NOT include system-managed fields such as id,
   * created_at, updated_at, deleted_at, or any role/ownership columns.
   * Ownership is implied via the authenticated context after join flows and
   * through role assignment tables described in the Prisma schema.
   */
  export type ICreate = {
    /**
     * Email address used as the unique login identifier
     * (econ_discuss_users.email).
     *
     * Must be a valid RFC 5322 email string. Stored in normalized,
     * lower-cased form at the application layer to satisfy the Prisma
     * unique constraint on email. This value is persisted into the Actors
     * schema table econ_discuss_users (see schema-01-actors.prisma).
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password submitted by the client for account creation.
     *
     * SECURITY: NEVER stored in plaintext. The server must derive and
     * persist a secure password hash into econ_discuss_users.password_hash.
     * Clients MUST NOT send pre-hashed values here. This field maps to
     * business handling for the econ_discuss_users.password_hash column
     * documented in schema-01-actors.prisma.
     */
    password: string & tags.MinLength<8>;

    /**
     * Public display handle (econ_discuss_users.display_name).
     *
     * Shown on profiles and next to authored content. Validate length and
     * character policy at the application layer per business rules. Stored
     * in the econ_discuss_users table.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<120>;

    /**
     * Optional IANA timezone identifier (econ_discuss_users.timezone), for
     * example "Asia/Seoul".
     *
     * Used for digests, quiet hours, poll scheduling, and notification
     * timing. If omitted, backend defaults may apply.
     */
    timezone?: string | undefined;

    /**
     * Optional preferred locale tag (econ_discuss_users.locale), for
     * example "en-US" (BCP 47).
     *
     * Used for localized UI and communications.
     */
    locale?: string | undefined;

    /**
     * Optional avatar image URI for the profile
     * (econ_discuss_users.avatar_uri).
     *
     * Application should validate length and scheme and may enforce
     * safe-host policies.
     */
    avatar_uri?: (string & tags.Format<"uri">) | undefined;
  };
}
