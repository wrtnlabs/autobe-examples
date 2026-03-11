import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallProduct } from "../../../api/structures/IEcommerceMallProduct";
import { IPageIEcommerceMallProduct } from "../../../api/structures/IPageIEcommerceMallProduct";
import { getEcommerceMallProductsProductId } from "../../../providers/getEcommerceMallProductsProductId";
import { patchEcommerceMallProducts } from "../../../providers/patchEcommerceMallProducts";

@Controller("/ecommerceMall/products")
export class EcommercemallProductsController {
  /**
   * Retrieve a filtered and paginated list of products from the ecommerce catalog.
   *
   * This operation provides comprehensive product browsing capabilities for customers, sellers, and administrators. Products can be searched by name, filtered by category, sorted by various criteria (created date, price, name), and paginated for efficient data retrieval.
   *
   * For customers, only active products are returned by default. Sellers can view all their products (active and inactive) using seller-specific filtering. Administrators have full access to view all products regardless of status.
   *
   * Each product in the response includes essential information: ID, name, base price, category name, seller shop name, active status, creation date, and image count. This summary format optimizes the response size for product listing displays in product grids and catalog browsers.
   *
   * Products are ordered by creation date (newest first) by default, but custom sorting is supported through request parameters.
   *
   * @param connection
   * @param body Search criteria, filters, sorting options, and pagination parameters for product listing.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement paginated product list query with the following behavior:
   *
   * Query ecommerce_mall_products table with conditional filtering:
   * - category_id: Filter products by specific category
   * - seller_id: Filter products by seller (seller's own products only, or admin override)
   * - is_active: Filter by active/inactive status (defaults to true for customers)
   * - name_search: Partial match search on product name using LIKE or full-text search
   * - created_after: Products created after this date
   * - created_before: Products created before this date
   * - min_price: Filter products with base_price >= this value
   * - max_price: Filter products with base_price <= this value
   *
   * Join operations:
   * - LEFT JOIN with ecommerce_mall_categories to include category name
   * - LEFT JOIN with ecommerce_mall_sellers to include seller shop_name
   * - LEFT JOIN with ecommerce_mall_product_images to count total images per product
   *
   * Sorting options:
   * - created_at: Newest first (default), or oldest first
   * - base_price: Price ascending or descending
   * - name: Name alphabetically ascending or descending
   * - image_count: Products by image count
   *
   * Authorization:
   * - Customers: Only view is_active=true products, can filter by category
   * - Sellers: Can view all their own products (active and inactive), cannot view other sellers' products
   * - Admins: Can view all products including deactivated ones
   *
   * Pagination:
   * - Cursor-based pagination for large result sets
   * - Default page size: 20 products per page
   * - Maximum page size: 100 products per page
   * - Returns nextCursor for navigation to next page
   * - Returns hasNextPage boolean
   *
   * Response structure includes:
   * - pagination: { page, limit, totalCount, hasNextPage, nextCursor }
   * - data: Array of product summaries (IEcommerceMallProduct.ISummary)
   *
   * Error handling:
   * - 400 Bad Request: Invalid filter values, invalid sort field, invalid pagination parameters
   * - 401 Unauthorized: Missing authentication
   * - 403 Forbidden: Seller attempting to view other sellers' products without admin override
   * - 429 Too Many Requests: Rate limit exceeded
   *
   * Performance considerations:
   * - Use database indexes on category_id, seller_id, is_active, created_at, and name (GIN trigram for search)
   * - Implement query timeout for expensive searches
   * - Cache frequently accessed product lists at application level with appropriate TTL
   *
   * Business rules:
   * - If seller_id filter provided without admin auth, verify request_user_id == seller_id
   * - If customer, automatically filter to is_active=true unless explicitly overridden
   * - Products with zero variants may be excluded from search results (enforced if configured)
   * - Reseller's product visibility is hidden if their account is suspended
   *
   * Retry semantics:
   * - If database query fails due to transient error, retry up to 3 times with exponential backoff (1s, 2s, 4s delays)
   * - If all retries fail, return 503 Service Unavailable with appropriate error message
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody()
    body: IEcommerceMallProduct.IRequest,
  ): Promise<IPageIEcommerceMallProduct.ISummary> {
    try {
      return await patchEcommerceMallProducts({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific product in the catalog.
   *
   * This operation returns comprehensive product information including the product name, description, base price, active status, and related data such as seller shop profile, category information, product images in display order, and variant summary. The product must be active (is_active=true) in the ecommerce_mall_products table, not soft-deleted (deleted_at is null), and owned by a seller who is not suspended (seller.is_suspended=false in the ecommerce_mall_sellers table) to be returned.
   *
   * The response includes denormalized seller profile data (shop_name, shop_description, logo_image) from the ecommerce_mall_seller_profiles table for efficient display on product detail pages without additional API calls. Category information includes the full category name and parent category chain for breadcrumbs. Images are returned in displayOrder sequence with the first image serving as the main product thumbnail.
   *
   * Customers can view this operation on product detail pages after clicking a product from search results or category listings. Product ownership validation is performed server-side to ensure only active, visible products are returned. Products with is_active=false or associated with suspended sellers are filtered out from results.
   *
   * @param connection
   * @param productId The UUID identifier of the product to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Query ecommerce_mall_products table by id.
   * Validate product exists and is_active = true.
   * If product exists, join with:
   * - ecommerce_mall_sellers (for seller_id)
   * - ecommerce_mall_seller_profiles (for shop_name, shop_description, logo_image)
   * - ecommerce_mall_categories (for category name)
   * - ecommerce_mall_product_images (all images for this product, ordered by display_order)
   * - ecommerce_mall_product_variants (count and basic info for variants list)
   *
   * Check seller is_suspended = false (skip products from suspended sellers per section 792).
   * Return 404 if product not found, not active, or owned by suspended seller.
   *
   * Return product details with:
   * - id, name, description, base_price, is_active, created_at, updated_at
   * - seller shop_name, shop_description, logo_image_url
   * - category name (and parent category if applicable)
   * - images array sorted by display_order
   * - variants_count and sample variants for quick overview
   *
   * All image URLs and file paths use absolute URIs per schema image_url field requirements.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":productId")
  public async at(
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
  ): Promise<IEcommerceMallProduct> {
    try {
      return await getEcommerceMallProductsProductId({
        productId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
