import { tags } from "typia";

export namespace IShoppingMallSearch {
  /**
   * Request DTO for global search operations on the shoppingMall platform.
   * This schema defines the structure of parameters accepted by the
   * /shoppingMall/search/global endpoint for unified search across products,
   * reviews, and categories.
   */
  export type IRequest = {
    /**
     * The search query term to match against product titles, descriptions,
     * tags, brand names, category names, and review contents. Must be a
     * non-empty string containing at least one character for meaningful
     * search results.
     */
    q: string;

    /**
     * The page number for pagination results. Must be a positive integer
     * starting from 1. Default value is 1 when not specified.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * The number of results per page. Must be between 1 and 100 inclusive.
     * Default value is 20 when not specified. Higher values may impact
     * performance.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * The sorting criterion for search results. Must be one of: 'relevance'
     * (default), 'newest', or 'highest_rated'. Determines the order of
     * returned search results based on business logic priorities.
     */
    sort?: "relevance" | "newest" | "highest_rated" | undefined;
  };

  /**
   * Paginated summary of global search results across products, reviews, and
   * categories on the shoppingMall platform. Each result item is
   * discriminated by type to indicate its source.
   *
   * This schema represents lightweight summary entries for search result
   * display in user interfaces. It consolidates results from three distinct
   * data sources: products, reviews, and categories.
   *
   * Product entries provide core information for item discovery: title,
   * brand, primary category, and price range. Review entries surface customer
   * feedback with context: content snippet, rating, and associated product
   * ID. Category entries enable navigation: name and description for category
   * exploration.
   *
   * The type discriminator ('source') is critical for UI rendering: it
   * determines which template and interaction logic to apply. Product results
   * link to product detail pages, review results link to review detail pages
   * with product context, and category results link to category listing
   * pages.
   *
   * All text fields are truncated to display snippets suitable for list
   * views. Primary image thumbnails (when available) are referenced by URL.
   * Search term highlighting occurs at the UI layer using the provided
   * keyword context.
   *
   * All entity identifiers are exposed as strings for linking, but no
   * personally identifiable or seller-specific sensitive data is included.
   * Inventory status and approval state are enforced at the data layer before
   * inclusion in results.
   *
   * This schema is used in conjunction with IShoppingMallSearch.IRequest to
   * power the unified search experience at /shoppingMall/search/global.
   */
  export type ISummary = {
    /**
     * Discriminator field indicating the type of search result source.
     *
     * Must be one of: 'product', 'review', or 'category'. This determines
     * the structure of the remaining properties for this result item.
     *
     * - 'product': Result represents a product listing from
     *   shopping_mall_products
     * - 'review': Result represents a product review from
     *   shopping_mall_product_reviews
     * - 'category': Result represents a category from
     *   shopping_mall_categories
     *
     * UI uses this to determine which card template to render and what
     * actions are available. This field must have one of these exact values
     * to ensure proper rendering.
     */
    source: "product" | "review" | "category";

    /**
     * Unique identifier for the search result entity.
     *
     * For 'product' source: product ID (matching shopping_mall_products.id)
     * For 'review' source: review ID (matching
     * shopping_mall_product_reviews.id) For 'category' source: category ID
     * (matching shopping_mall_categories.id)
     *
     * This ID is used to construct direct links from the search result to
     * the respective detail page.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display name of the search result.
     *
     * For 'product': Product title (from shopping_mall_products.title,
     * truncated for display) For 'review': First 120 characters of review
     * content (truncated, with ellipsis) For 'category': Category name
     * (from shopping_mall_categories.name)
     *
     * This is the primary visual element displayed in search results.
     */
    name: string;

    /**
     * Brief description or summary snippet for the search result.
     *
     * For 'product': Product description (from
     * shopping_mall_products.description, truncated to 180 chars) For
     * 'review': Review body excerpt (truncated, with highlights of search
     * terms) For 'category': Category description (from
     * shopping_mall_categories.description, truncated to 200 chars)
     *
     * Used to provide additional context beyond the name in search results.
     */
    description: string;

    /**
     * URL to a primary thumbnail image representing the result.
     *
     * For 'product' source: URL of the primary product image (from
     * shopping_mall_product_images.url), expected to be 400x400 pixels in
     * standard JPEG format For 'review' source: URL of a representative
     * image from the review if available (from
     * shopping_mall_review_images.url), expected to be 800x600 pixels in
     * standard JPEG or PNG format For 'category' source: URL of category
     * logo or banner (from shopping_mall_categories.logo_url), expected to
     * be 200x200 pixels in standard PNG format
     *
     * Displayed alongside the result summary. For reviews, this might be a
     * product image, not the review upload. If no image is available, this
     * field will be null.
     */
    thumbnail?: string | undefined;

    /**
     * Date and time when this result was last updated or created.
     *
     * For 'product': Last updated timestamp from
     * shopping_mall_products.updated_at or most recent variant pricing
     * update in ISO 8601 format For 'review': Review creation timestamp
     * from shopping_mall_product_reviews.created_at in ISO 8601 format For
     * 'category': Last updated timestamp from
     * shopping_mall_categories.updated_at in ISO 8601 format
     *
     * Used for sorting results by freshness and detecting recently updated
     * entries.
     */
    updatedAt: string & tags.Format<"date-time">;
  };
}
