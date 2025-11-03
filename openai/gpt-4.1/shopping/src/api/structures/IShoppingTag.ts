import { tags } from "typia";

export namespace IShoppingTag {
  /**
   * Summary information for a single tag applied to products in
   * search/filter/labeling interfaces. Tags are business-created labels (see
   * shopping_product_tags) attached to products for enhanced catalog
   * filtering, user search, and administrative curation. Used in product
   * summary responses, tag cloud displays, and as filter options in product
   * list APIs. Each object exposes the unique tag identifier, canonical code
   * for API/analytics, and display value for UI/business context. Example:
   * tag_code 'vegan', display_value 'Vegan Friendly'.
   */
  export type ISummary = {
    /**
     * Unique identifier for this product tag record. UUID string as
     * assigned in shopping_product_tags.id. Used in search/filter and tag
     * management APIs.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Business code/slug uniquely representing the product tag (e.g.,
     * 'eco', 'vegan'). Used for API/URL/addressable reference. Expects
     * lowercase, hyphen/underscore-separated token. Example:
     * 'organic-cotton'.
     */
    tag_code: string;

    /**
     * Business/UI-facing display name for this tag (as seen by users in
     * catalog search, filters, or product page). Example: 'Eco-Friendly',
     * 'Premium', 'Handmade'.
     */
    display_value: string;
  };
}
