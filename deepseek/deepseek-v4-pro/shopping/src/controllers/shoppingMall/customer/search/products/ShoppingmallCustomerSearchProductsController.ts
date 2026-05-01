import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IPageIShoppingMallProduct } from "../../../../../api/structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "../../../../../api/structures/IShoppingMallProduct";
import { CustomerAuth } from "../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../decorators/payload/CustomerPayload";
import { patchShoppingMallCustomerSearchProducts } from "../../../../../providers/patchShoppingMallCustomerSearchProducts";

@Controller("/shoppingMall/customer/search/products")
export class ShoppingmallCustomerSearchProductsController {
  /**
   * Search for products across the entire marketplace using text search, category, price range, and stock availability filters.
   *
   * The search endpoint provides the primary product discovery mechanism for customers. Results include products from all approved sellers whose accounts are not suspended or banned. Soft-deleted products are excluded from results. The search supports trigram-based fuzzy matching on product names, allowing customers to find products even with partial or approximate search terms.
   *
   * Filters can be combined — applying multiple filters simultaneously returns only products matching all criteria. When a category filter is applied, products in the specified category and all its direct subcategories are included in results. The in-stock only filter restricts results to products with at least one variant having positive stock, computed from the ledger-based inventory system.
   *
   * Results are paginated and can be sorted by newest first, price ascending, or price descending. Each result includes the product's main thumbnail image, name, price information, seller shop name, and average customer rating. Products without any variants are included in results but displayed as unavailable for purchase.
   *
   * @param connection
   * @param body Search criteria including optional text query, category filter, price range (minimum and maximum), in-stock only toggle, sort preference, and pagination parameters.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Query the shopping_mall_products table with the
     *   following rules:
   *
   * **Visibility Filtering (MUST apply before any user-requested filters):**
   * - Exclude products where deleted_at IS NOT NULL (soft-deleted products)
   * - Exclude products whose seller has suspended_at IS NOT NULL (suspended seller's products are hidden)
   * - Exclude products whose seller has banned_at IS NOT NULL (banned seller's products are hidden)
   *
   * **Text Search:**
   * - When a search query is provided in the request body, perform trigram-based fuzzy matching on the product name column using the GIN index (gin_trgm_ops)
   * - When no search query is provided, return all visible products (subject to other filters)
   *
   * **Category Filter:**
   * - When a category ID is specified, include products where shopping_mall_category_id matches either the specified category OR any of its direct child subcategories
   * - Query the shopping_mall_categories table to resolve subcategory IDs (WHERE parent_id = specifiedCategoryId), then use IN clause on shopping_mall_category_id
   * - Uncategorized products are always included in search results when no category filter is applied
   *
   * **Price Range Filter:**
   * - When a minimum price is specified, include only products whose base_price >= minimum price
   * - When a maximum price is specified, include only products whose base_price <= maximum price
   * - When both are specified, include products where base_price BETWEEN min AND max
   *
   * **In-Stock Only Filter:**
   * - When the in-stock only filter is true, include only products that have at least one non-deleted variant (deleted_at IS NULL on shopping_mall_product_variants) with positive stock
   * - Stock is computed by summing quantity_change from shopping_mall_inventory_records for each variant — a variant has stock > 0 when SUM(quantity_change) > 0
   * - Use a subquery or EXISTS clause: EXISTS (SELECT 1 FROM shopping_mall_product_variants v WHERE v.shopping_mall_product_id = p.id AND v.deleted_at IS NULL AND (SELECT COALESCE(SUM(ir.quantity_change), 0) FROM shopping_mall_inventory_records ir WHERE ir.shopping_mall_product_variant_id = v.id) > 0)
   *
   * **Sorting:**
   * - 'newest': ORDER BY created_at DESC
   * - 'price_asc': ORDER BY base_price ASC
   * - 'price_desc': ORDER BY base_price DESC
   * - Default when no sort specified: ORDER BY created_at DESC (newest first)
   *
   * **Pagination:**
   * - Use cursor-based pagination for performance on large result sets
   * - Return total count reflecting only filtered results (not unfiltered total)
   *
   * **Building Summary DTOs (IShoppingMallProduct.ISummary):**
   * For each product in the result set:
   * - Product ID, name, base_price: from shopping_mall_products
   * - Main thumbnail image: SELECT image_url FROM shopping_mall_product_images WHERE shopping_mall_product_id = p.id ORDER BY display_order ASC LIMIT 1 — use this as the thumbnail URL; null if no images exist
   * - Seller shop name: JOIN shopping_mall_sellers s ON p.shopping_mall_seller_id = s.id, LEFT JOIN shopping_mall_seller_profiles sp ON sp.shopping_mall_seller_id = s.id, use sp.shop_name
   * - Average rating: SELECT COALESCE(AVG(r.rating), 0) FROM shopping_mall_review_reviews r WHERE r.shopping_mall_product_id = p.id AND r.deleted_at IS NULL — return as a float; if no reviews exist, return null to indicate "no rating"
   * - Price range: if the product has multiple non-deleted variants with different effective prices (using base_price as default when variant price is null), compute min and max effective prices across variants; if all variants share the same effective price or there is only one variant, show a single price
   *
   * **Performance Considerations:**
   * - Use LEFT JOINs for seller profile and category lookups
   * - The GIN trigram index on product name supports efficient fuzzy text search
   * - Apply visibility filters early to minimize the working set
   * - Evaluate in-stock filter via EXISTS subquery to avoid full inventory summation for every product
   *
   * **Edge Cases:**
   * - When no products match the search criteria, return an empty page with total count 0
   * - When a product has no images, the thumbnail field in the summary is null
   * - When a product has no reviews, the average rating field is null
   * - When a seller has no seller profile or no shop_name, display a fallback or null
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async search(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallProduct.IRequest,
  ): Promise<IPageIShoppingMallProduct.ISummary> {
    try {
      return await patchShoppingMallCustomerSearchProducts({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
