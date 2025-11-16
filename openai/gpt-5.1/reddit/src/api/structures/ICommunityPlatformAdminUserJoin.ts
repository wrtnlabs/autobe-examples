import { tags } from "typia";

export namespace ICommunityPlatformAdminUserJoin {
  /**
   * Request body schema for registering a new administrative account
   * (adminUser) in the community platform.
   *
   * This DTO collects only the business input fields required from the client
   * at join time and maps them onto the non-nullable columns of the
   * `community_platform_adminusers` Prisma model that must be populated on
   * creation. It intentionally excludes system-managed and security-internal
   * fields such as `id`, `password_hash`, timestamps, and deletion markers.
   *
   * The server is responsible for deriving the `password_hash` value from the
   * provided plain-text password, initializing flags like `is_super_admin`,
   * `is_suspended`, `is_banned`, and counters such as `failed_login_count`,
   * as well as setting `created_at`, `updated_at`, and leaving `locked_until`
   * and `deleted_at` as null. Username and email values submitted through
   * this schema are validated for uniqueness against active rows (where
   * `deleted_at` is null) according to the unique indexes defined on
   * `community_platform_adminusers.username` and
   * `community_platform_adminusers.email`.
   *
   * This request type does not contain any authentication context, tokens, or
   * system tracing data; those are handled by the backend. The shape is
   * optimized for secure, minimal admin signup while ensuring alignment with
   * the underlying Prisma entity.
   */
  export type IRequest = {
    /**
     * Administrative handle for the adminUser account.
     *
     * This value is written into the `username` column of
     * `community_platform_adminusers` and must be unique among active
     * adminUser rows according to the table's unique index on `username`.
     * It is used for identification within administrative tools and may
     * also be used as a login identifier depending on business rules.
     *
     * Validation rules typically enforce non-empty content, reasonable
     * length limits, and allowed character sets, but those constraints are
     * enforced server-side beyond this structural schema.
     */
    username: string;

    /**
     * Administrative contact email for the adminUser account.
     *
     * This value maps directly to the `email` column of
     * `community_platform_adminusers` and must be unique among active
     * adminUser rows according to the table's unique index on `email`. It
     * is used for security alerts, password resets, and account-related
     * notifications.
     *
     * The server validates this field as a well-formed email address and
     * may impose additional business constraints such as restricting
     * domains or requiring verification flows.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password for the new administrative account.
     *
     * The backend uses this value only transiently to derive the secure
     * `password_hash` stored in the
     * `community_platform_adminusers.password_hash` column, in accordance
     * with the schema comment that plain-text credentials must never be
     * persisted. Clients must never send pre-hashed values here; hashing
     * and salting are exclusively the responsibility of the server.
     *
     * Password strength and policy rules (such as minimum length, required
     * character classes, or breach checks) are enforced server-side and may
     * result in validation errors if the submitted password does not meet
     * configured requirements.
     */
    password: string & tags.Format<"password">;
  };
}
