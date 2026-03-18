import { tags } from "typia";

import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IShoppingMallSellerProfile {
  /**
   * Search and pagination criteria for browsing seller storefront profiles. This request object is used by list endpoints to find seller storefronts by text and navigate through paginated results. It contains only query controls, not seller profile data itself.
   */
  export type IRequest = {
    /**
     * Text used to search seller storefront profiles by shop name or description.
     *
     * @x-autobe-specification Treat as free-text search input for shopping_mall_seller_profiles. Match against shop_name and shop_description when building the listing query. Do not persist this value; use it only to construct search predicates in the request handler.
     */
    search?: (string & tags.MinLength<1>) | undefined;

    /**
     * Page number to retrieve from the seller profile list.
     *
     * @x-autobe-specification Use as the 1-indexed page number for paginating seller profile list results. The handler should translate this value into offset/limit pagination and enforce the platform's paging rules.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of seller profile records to return per page.
     *
     * @x-autobe-specification Use as the maximum number of seller profile records returned per page. The handler should enforce the configured upper bound and apply this value when calculating the page window.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * A lightweight summary of a seller's current storefront profile for list views and storefront browsing. It exposes the active shop identity, the owning seller summary, and the profile timestamps without historical snapshot data.
   */
  export type ISummary = {
    /**
     * Unique identifier of this seller profile summary.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_seller_profiles.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Summary information about the seller who owns this storefront profile.
     *
     * @x-autobe-database-schema-property seller
     * @x-autobe-specification Join shopping_mall_seller_profiles.shopping_mall_seller_id to shopping_mall_sellers.id and expose the related seller as IShoppingMallSeller.ISummary.
     */
    seller: IShoppingMallSeller.ISummary;

    /**
     * Public storefront name shown to customers.
     *
     * @x-autobe-database-schema-property shop_name
     * @x-autobe-specification Direct mapping from shopping_mall_seller_profiles.shop_name.
     */
    shopName: string;

    /**
     * Public description of the seller's shop and business identity.
     *
     * @x-autobe-database-schema-property shop_description
     * @x-autobe-specification Direct mapping from shopping_mall_seller_profiles.shop_description.
     */
    shopDescription: string;

    /**
     * URL of the storefront logo image.
     *
     * @x-autobe-database-schema-property logo_image_url
     * @x-autobe-specification Direct mapping from shopping_mall_seller_profiles.logo_image_url.
     */
    logoImageUrl: string & tags.MaxLength<80000>;

    /**
     * Timestamp when this storefront profile was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_profiles.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this storefront profile was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_profiles.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this storefront profile was soft-deleted, or null if it is active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_profiles.deleted_at. Preserve null when the profile is active and expose the deletion timestamp when soft-deleted.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
