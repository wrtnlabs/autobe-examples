import { tags } from "typia";

export namespace IShoppingMallProfileSnapshot {
  /**
   * Lightweight profile snapshot summary for paginated list views. Each entry represents a point-in-time capture of profile changes, automatically created when a user (customer or seller) edits their profile. Used in history timelines to show when profile modifications occurred, with profile_type indicating whether the snapshot belongs to a customer or seller profile.
   */
  export type ISummary = {
    /**
     * Unique identifier for this profile snapshot record, generated as UUID v4 when the snapshot is created.
     *
     * @x-autobe-specification Generated UUID v4 when profile snapshot is created. For seller: generated when shopping_mall_sellers profile fields change. For customer: generated when shopping_mall_customers profile fields change. Not mapped to a specific database column - computed identifier for the snapshot event.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the profile snapshot was created, capturing the exact moment the profile was modified.
     *
     * @x-autobe-specification Derived from updated_at timestamp of shopping_mall_sellers (for seller profiles) or shopping_mall_customers (for customer profiles) when profile fields are modified. Captures the exact moment the profile change occurred. Not a stored column - computed from source table's updated_at.
     */
    snapshot_at: string & tags.Format<"date-time">;

    /**
     * Type of profile this snapshot belongs to: 'customer' for customer profile changes (display name, phone) or 'seller' for seller profile changes (shop name, description, logo).
     *
     * @x-autobe-specification Discriminator computed based on the source of the profile change: 'seller' when shopping_mall_sellers profile is updated, 'customer' when shopping_mall_customers profile is updated. Not stored in database - derived from the actor context making the request.
     */
    profile_type: "customer" | "seller";
  };
}
