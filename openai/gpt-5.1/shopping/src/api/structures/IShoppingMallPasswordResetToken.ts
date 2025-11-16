import { tags } from "typia";

import { IShoppingMallAuthCredentials } from "./IShoppingMallAuthCredentials";

export namespace IShoppingMallPasswordResetToken {
  /**
   * Search and filter criteria for querying password reset token records
   * associated with a specific authentication credentials entry in the
   * `shopping_mall_password_reset_tokens` table.
   *
   * This DTO is used exclusively by platform administrators to perform
   * complex, read-only searches over password reset token history for a
   * single credentials record identified by the `authCredentialsId` path
   * parameter. All filters are optional and are applied in addition to the
   * mandatory foreign-key scope on
   * `shopping_mall_password_reset_tokens.shopping_mall_auth_credentials_id`.
   *
   * The fields in this request are intentionally aligned with concrete Prisma
   * columns on `shopping_mall_password_reset_tokens`, such as `token`,
   * `created_at`, `expires_at`, and `consumed_at`, so that backend
   * implementations can build straightforward, type-safe queries without
   * inventing synthetic status fields or derived columns.
   */
  export type IRequest = {
    /**
     * 1-based page index for paginated results.
     *
     * If omitted, the implementation should treat this as page 1. This
     * value is used together with `limit` to determine the slice of
     * matching password reset token records to return.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of password reset token records to return in a single
     * page.
     *
     * Backends may enforce an upper bound to protect performance and should
     * clamp or reject excessively large values according to platform-wide
     * pagination policy.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Optional filter for the opaque password reset token string stored in
     * `shopping_mall_password_reset_tokens.token`.
     *
     * This filter is primarily intended for security operations and support
     * tooling where a specific token value (for example, copied from a log
     * or external system) needs to be looked up precisely. Implementations
     * may perform exact or implementation-defined matching, but MUST NOT
     * expose or log token values inappropriately when processing this
     * field.
     */
    token?: string | undefined;

    /**
     * Inclusive lower bound for the token creation timestamp filter mapped
     * to `shopping_mall_password_reset_tokens.created_at`.
     *
     * Only token records whose `created_at` value is greater than or equal
     * to this ISO 8601 UTC timestamp should be included in the result set.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Inclusive upper bound for the token creation timestamp filter mapped
     * to `shopping_mall_password_reset_tokens.created_at`.
     *
     * Only token records whose `created_at` value is less than or equal to
     * this ISO 8601 UTC timestamp should be included in the result set.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Inclusive lower bound for password reset token expiration time
     * filtering mapped to
     * `shopping_mall_password_reset_tokens.expires_at`.
     *
     * Only tokens whose `expires_at` value is greater than or equal to this
     * ISO 8601 UTC timestamp should be returned.
     */
    expiresAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Inclusive upper bound for password reset token expiration time
     * filtering mapped to
     * `shopping_mall_password_reset_tokens.expires_at`.
     *
     * Only tokens whose `expires_at` value is less than or equal to this
     * ISO 8601 UTC timestamp should be returned.
     */
    expiresAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional flag indicating whether to limit results based on whether
     * the token has been consumed, as derived from
     * `shopping_mall_password_reset_tokens.consumed_at`.
     *
     * When `true`, only tokens whose `consumed_at` column is non-null
     * should be returned. When `false`, only tokens with `consumed_at` =
     * null (i.e. not yet consumed) should be returned. When omitted, both
     * consumed and unconsumed tokens are included unless further restricted
     * by other filters.
     */
    consumed?: boolean | undefined;

    /**
     * Inclusive lower bound for filtering tokens based on the moment they
     * were consumed, mapped to
     * `shopping_mall_password_reset_tokens.consumed_at`.
     *
     * Only tokens whose `consumed_at` value is greater than or equal to
     * this ISO 8601 UTC timestamp should be returned. Records with
     * `consumed_at` = null are not affected by this filter.
     */
    consumedAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Inclusive upper bound for filtering tokens based on the moment they
     * were consumed, mapped to
     * `shopping_mall_password_reset_tokens.consumed_at`.
     *
     * Only tokens whose `consumed_at` value is less than or equal to this
     * ISO 8601 UTC timestamp should be returned. Records with `consumed_at`
     * = null are not affected by this filter.
     */
    consumedAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Field name to use for sorting the password reset tokens within the
     * scoped credentials entry.
     *
     * Typical supported values should correspond to concrete columns on
     * `shopping_mall_password_reset_tokens`, such as `created_at`,
     * `expires_at`, or `consumed_at`. Backends should validate or normalize
     * this value and fall back to a safe default if an unsupported column
     * name is provided.
     */
    sortBy?: string | undefined;

    /**
     * Sort direction to apply when ordering password reset tokens by the
     * field specified in `sortBy`.
     *
     * Allowed values are `asc` for ascending order and `desc` for
     * descending order. When omitted, the backend should apply its default
     * sort direction, typically descending by `created_at`.
     */
    sortDirection?: "asc" | "desc" | undefined;
  };

  /**
   * Summary view of a shopping mall password reset token used during the
   * credential recovery flow.
   *
   * This DTO provides non-sensitive, high-level information for
   * administrative listings, security monitoring, and audit contexts without
   * exposing the raw token value itself. In particular, it never returns the
   * underlying `token` column from the `shopping_mall_password_reset_tokens`
   * Prisma model.
   *
   * The `status` field is a **derived lifecycle indicator**, computed by
   * business logic from timestamps such as `expires_at` and `used_at` (mapped
   * from the `consumed_at` column) and from any additional invalidation
   * rules. It is not a physical column in the
   * `shopping_mall_password_reset_tokens` table, but a convenient summary of
   * the token's current usability state for dashboards and tools.
   *
   * The `authCredentials` association replaces the raw foreign key
   * `shopping_mall_auth_credentials_id` with a lightweight summary of the
   * owning credentials record, allowing atomic reads that include both token
   * metadata and its owning identity without exposing sensitive credential
   * details directly.
   */
  export type ISummary = {
    /**
     * Unique identifier of the password reset token record.
     *
     * This is the primary key of the `shopping_mall_password_reset_tokens`
     * Prisma model and is used as the canonical reference for this token in
     * administrative tools, logs, and debugging workflows.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Summary of the authentication credentials record that this reset
     * token is associated with.
     *
     * This object provides contextual information about the login identity
     * (such as actor type and identifier) without exposing sensitive
     * credential fields. It replaces the raw foreign key field
     * `shopping_mall_auth_credentials_id` from the underlying Prisma model
     * to enable richer, atomic read operations without additional lookups.
     */
    authCredentials: IShoppingMallAuthCredentials.ISummary;

    /**
     * Timestamp indicating when this password reset token becomes invalid.
     *
     * After this moment, the token can no longer be used to reset a
     * password and any attempt to consume it must be rejected by the
     * backend. The value is stored in the `expires_at` column of the
     * `shopping_mall_password_reset_tokens` table and returned as an ISO
     * 8601 date-time string in UTC.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this password reset token record was created.
     *
     * This value comes from the `created_at` column of the
     * `shopping_mall_password_reset_tokens` table and is useful for
     * auditing when the reset flow was initiated and for understanding
     * token age in administrative listings.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this password reset token was successfully consumed to
     * reset a password.
     *
     * This field is a DTO-level naming of the underlying nullable
     * `consumed_at` column on the `shopping_mall_password_reset_tokens`
     * Prisma model. It is null while the token is still pending and has not
     * been used, and it is populated only once the reset operation
     * completes successfully.
     *
     * By exposing this value in a read-only fashion, administrative and
     * security tooling can reconstruct when the token was actually used,
     * supporting audit trails, anomaly detection, and incident
     * investigations.
     */
    used_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * High-level lifecycle status of the password reset token.
     *
     * Typical examples include values such as `pending`, `used`, or
     * `expired`. The exact set of statuses is defined by business rules and
     * can evolve over time. This field is **derived** by the application
     * (for example, from `expires_at`, `used_at`/`consumed_at`, and any
     * soft-invalidation flags) rather than being stored as a dedicated
     * column in the `shopping_mall_password_reset_tokens` table.
     *
     * Exposing a single lifecycle status string allows administrative
     * tooling and monitoring dashboards to quickly understand whether the
     * token is currently usable, has already been consumed, or has become
     * invalid without having to interpret raw timestamps for each record.
     */
    status: string;
  };
}
