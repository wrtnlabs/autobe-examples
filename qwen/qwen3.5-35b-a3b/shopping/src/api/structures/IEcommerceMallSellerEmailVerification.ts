import { tags } from "typia";

import { IEcommerceMallSeller } from "./IEcommerceMallSeller";

export namespace IEcommerceMallSellerEmailVerification {
  /**
   * Lightweight summary of seller email verification token for display in lists and paginated views. Contains verification timing information and current status without exposing the sensitive token value itself.
   */
  export type ISummary = {
    /**
     * Unique identifier for the email verification token record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_email_verifications.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The seller account associated with this email verification token.
     *
     * @x-autobe-database-schema-property seller
     * @x-autobe-specification Join from ecommerce_mall_seller_email_verifications.seller_id to ecommerce_mall_sellers.id. Returns IEcommerceMallSeller.ISummary.
     */
    seller: IEcommerceMallSeller.ISummary;

    /**
     * Timestamp when the verification token expires.
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_email_verifications.expires_at. Timestamp when verification token expires (typically 24 hours from creation).
     */
    expiresAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the verification token was used, or null if not yet used.
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_email_verifications.used_at. Nullable - null if token not yet used.
     */
    usedAt: (string & tags.Format<"date-time">) | null;

    /**
     * Timestamp when the verification token was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_email_verifications.created_at. Timestamp when verification token was created.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this verification record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_email_verifications.updated_at. Timestamp of last update to this record.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the verification token was soft-deleted, or null if active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_email_verifications.deleted_at. Nullable - soft deletion timestamp after expiration.
     */
    deletedAt: (string & tags.Format<"date-time">) | null;

    /**
     * Current verification status: pending (not yet used), used (successfully verified), or expired.
     *
     * @x-autobe-specification Computed field: pending if used_at=null, used if used_at!=null and expires_at>now, expired otherwise. Logic: (used_at === null) ? 'pending' : (expires_at > now && used_at !== null) ? 'used' : 'expired'.
     */
    status: "pending" | "used" | "expired";
  };

  /**
   * Search criteria and pagination parameters for filtering email verification records. Supports searching by verification status, entity type, email address, date ranges, and specific user IDs. Enables flexible querying of email verification tokens across all user types with configurable pagination and sorting.
   */
  export type IRequest = {
    status?: "pending" | "used" | "expired" | undefined;
    entity_type?: "admin" | "customer" | "seller" | undefined;
    email?: (string & tags.MinLength<1> & tags.MaxLength<255>) | undefined;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_after?: (string & tags.Format<"date-time">) | undefined;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_before?: (string & tags.Format<"date-time">) | undefined;
    /**
     * @x-autobe-database-schema-property expires_at
     */
    expires_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter records used after this date-time (token may be unused).
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Filter records used after this date-time. Maps to ecommerce_mall_seller_email_verifications.used_at (nullable). When null, token has not been used yet.
     */
    used_after?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter records used before this date-time (token may be unused).
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Filter records used before this date-time. Maps to ecommerce_mall_seller_email_verifications.used_at (nullable). When null, token has not been used yet.
     */
    used_before?: (string & tags.Format<"date-time">) | null | undefined;
    /**
     * @x-autobe-database-schema-property seller_id
     */
    seller_id?: (string & tags.Format<"uuid">) | undefined;
    customer_id?: (string & tags.Format<"uuid">) | undefined;
    admin_id?: (string & tags.Format<"uuid">) | undefined;
    page?: string | undefined;
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
    sort_by?:
      | "created_at"
      | "expires_at"
      | "used_at"
      | "status"
      | "email"
      | undefined;
    sort_order?: "ASC" | "DESC" | undefined;
  };
}
