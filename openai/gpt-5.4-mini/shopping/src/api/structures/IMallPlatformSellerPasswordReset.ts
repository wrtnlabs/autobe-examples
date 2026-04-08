import { tags } from "typia";

import { IMallPlatformSeller } from "./IMallPlatformSeller";

export namespace IMallPlatformSellerPasswordReset {
  /**
   * Seller password reset summary information.
   *
   * This object represents one seller password reset record with a nested seller account summary and safe lifecycle metadata for browsing, support review, and audit visibility.
   *
   * It includes the reset record identity, expiration and consumption timestamps, creation and update timestamps, and soft-deletion status. Sensitive token values and raw foreign keys are excluded so recovery activity can be inspected without exposing secrets.
   */
  export type ISummary = {
    /**
     * The unique identifier of the seller password reset record.
     *
     * This value lets clients reference a specific password reset entry in administrative and support workflows.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from mall_platform_seller_password_resets.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The seller account that owns this password reset record.
     *
     * This is returned as a nested seller summary so clients can inspect the account associated with the recovery event without exposing the raw foreign key.
     *
     * @x-autobe-database-schema-property sellerAccount
     * @x-autobe-specification Join from mall_platform_seller_password_resets.seller_account_id to mall_platform_seller_accounts.id and expose the related seller as IMallPlatformSeller.ISummary.
     */
    sellerAccount: IMallPlatformSeller.ISummary;

    /**
     * The time when this password reset token expires.
     *
     * If present, it indicates the cutoff after which the token can no longer be used for account recovery.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from mall_platform_seller_password_resets.expired_at. Nullable in the database and preserved as nullable in the DTO.
     */
    expiredAt: (string & tags.Format<"date-time">) | null;

    /**
     * The time when this password reset token was used.
     *
     * If present, it shows when the recovery token was successfully consumed; if null, the token has not yet been used.
     *
     * @x-autobe-database-schema-property consumed_at
     * @x-autobe-specification Direct mapping from mall_platform_seller_password_resets.consumed_at. Nullable in the database and preserved as nullable in the DTO.
     */
    consumedAt: (string & tags.Format<"date-time">) | null;

    /**
     * The time when this password reset record was created.
     *
     * This timestamp supports audit trails and browsing of password recovery activity.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from mall_platform_seller_password_resets.created_at.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * The time when this password reset record was last updated.
     *
     * This reflects administrative or system changes to the recovery record.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from mall_platform_seller_password_resets.updated_at.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * The time when this password reset record was soft-deleted.
     *
     * If present, it indicates the recovery record has been removed from active use while remaining available for audit history.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from mall_platform_seller_password_resets.deleted_at. Nullable in the database and preserved as nullable in the DTO.
     */
    deletedAt: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Search criteria for browsing unified password-reset activity across marketplace accounts.
   *
   * Use this request body to filter password reset records by account type, owning account identifier, lifecycle status, creation and expiration time windows, sort order, and pagination controls.
   *
   * This DTO carries only safe query metadata for browsing and auditing password-reset history. It does not contain reset tokens, password hashes, or any other secret value.
   */
  export type IRequest = {
    /**
     * Filters password reset records by owning account type.
     *
     * Use this to limit results to one actor class such as customer, seller, or administrator. If null, the search includes all supported account types.
     *
     * @x-autobe-specification Use as the unified search scope selector across customer, seller, and administrator password-reset tables. When null, do not restrict by actor type. The value determines which underlying table family and owner-id semantics to apply.
     */
    accountType: string | null;

    /**
     * Filters password reset records by the owning account identifier.
     *
     * Use this together with accountType to search one specific account's reset history. If null, results are not restricted to a single owner.
     *
     * @x-autobe-specification Use as the owner identifier filter within the selected accountType scope. The concrete foreign-key column depends on the underlying reset table. When null, do not restrict by owner identifier.
     */
    accountId: (string & tags.Format<"uuid">) | null;

    /**
     * Filters password reset records by lifecycle status.
     *
     * Use this to search for resets in a specific state such as active, consumed, expired, or invalidated. If null, all states are included.
     *
     * @x-autobe-specification Use as the normalized lifecycle-state filter across customer, seller, and administrator password-reset tables. Translate the requested status to each table's equivalent state, such as active, consumed, expired, or invalidated/deleted. When null, do not apply any status filter.
     */
    status: string | null;

    /**
     * Sets the earliest creation time for matching password reset records.
     *
     * Use this as the inclusive start boundary for the creation timestamp. Records created before this moment are excluded.
     *
     * @x-autobe-specification Apply as an inclusive lower bound on the created_at timestamp of matching reset records. When null, no lower bound is applied.
     */
    createdFrom: (string & tags.Format<"date-time">) | null;

    /**
     * Sets the latest creation time for matching password reset records.
     *
     * Use this as the inclusive end boundary for the creation timestamp. Records created after this moment are excluded.
     *
     * @x-autobe-specification Apply as an inclusive upper bound on the created_at timestamp of matching reset records. When null, no upper bound is applied.
     */
    createdTo: (string & tags.Format<"date-time">) | null;

    /**
     * Sets the earliest expiration time for matching password reset records.
     *
     * Use this as the inclusive start boundary for the expiration timestamp. Records expiring before this moment are excluded.
     *
     * @x-autobe-specification Apply as an inclusive lower bound on the expired_at timestamp of matching reset records. When null, no lower bound is applied.
     */
    expiredFrom: (string & tags.Format<"date-time">) | null;

    /**
     * Sets the latest expiration time for matching password reset records.
     *
     * Use this as the inclusive end boundary for the expiration timestamp. Records expiring after this moment are excluded.
     *
     * @x-autobe-specification Apply as an inclusive upper bound on the expired_at timestamp of matching reset records. When null, no upper bound is applied.
     */
    expiredTo: (string & tags.Format<"date-time">) | null;

    /**
     * Controls how password reset search results are ordered.
     *
     * Use this field to choose a supported sort mode. If null, the default order is used.
     *
     * @x-autobe-specification Use as the sort selector for the unified password-reset search query. Support only endpoint-approved sort modes, and default to newest-first by created_at when null.
     */
    sort: string | null;

    /**
     * Selects which page of password reset search results to return.
     *
     * This value is 1-indexed. If null, the first page is returned.
     *
     * @x-autobe-specification Use as the 1-indexed page number for paginated search results. Apply it after filtering and sorting. When null, default to page 1.
     */
    page: (number & tags.Type<"int32"> & tags.Minimum<1>) | null;

    /**
     * Sets the maximum number of password reset records returned per page.
     *
     * If null, the endpoint default page size is used.
     *
     * @x-autobe-specification Use as the maximum number of records returned per page. Enforce the endpoint's allowed range during validation. When null, use the default page size.
     */
    limit: (number & tags.Type<"int32"> & tags.Minimum<1>) | null;
  };
}
