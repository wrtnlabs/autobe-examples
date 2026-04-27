import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallProduct } from "../../../structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "../../../structures/IShoppingMallProduct";

export * as images from "./images/index";
export * as variants from "./variants/index";
export * as reviews from "./reviews/index";

/**
 * Retrieve a filtered and paginated list of products from the shopping mall catalog.
 *
 * This operation provides advanced search and browsing capabilities across all active products on the platform. Consumers can filter results by category (including subcategory), seller, keyword in the product name or description, and price range. Results are returned as a paginated summary list optimized for display in product listing pages, search result pages, and category browsing views.
 *
 * The underlying data source is the `shopping_mall_products` table. Products with a non-null `deleted_at` are excluded from results, ensuring only currently active listings are returned. Products belonging to suspended sellers are also hidden from customer-facing results. Products that are uncategorized (i.e., `shopping_mall_category_id` is null, because their category was deleted) may still appear in keyword search results but will not appear in category-filtered browsing.
 *
 * Filtering supports:
 * - **Keyword search**: Partial match on the product `name` field using GIN trigram index for efficient full-text-like search.
 * - **Category filter**: Filter products by a specific category ID. When a top-level category is specified, results may include products from its subcategories as well.
 * - **Seller filter**: Restrict results to products owned by a specific seller.
 * - **Price range**: Filter by minimum and/or maximum `base_price` (or variant `price_override` where applicable).
 *
 * Pagination and sorting are supported to enable efficient browsing of large product catalogs. The caller specifies page size and the desired sort order (e.g., by creation date, price, or name).
 *
 * This endpoint is accessible to all authenticated and unauthenticated actors (public browsing). Customers use it to discover products. Sellers may use it to view the public catalog (but not internal management details of other sellers' products). Administrators can also use this endpoint for platform-wide product oversight.
 *
 * Before viewing a specific product's full detail, callers should first use this endpoint to find the product and obtain its ID, then use `GET /products/{productId}` to retrieve the complete product information including images, variants, and snapshot history.
 *
 * @param props.connection
 * @param props.body Search criteria, filters, pagination, and sorting options for the product list
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification 1. Parse the request body for search criteria: keyword (partial name match), categoryId, sellerId, minPrice, maxPrice, pagination (page number, page size), and sort options (field + direction).
 *
 * 2. Build a base query against `shopping_mall_products` with the following always-applied filters:
 *    - `deleted_at IS NULL` (exclude products)
 *    - JOIN with `shopping_mall_sellers` to filter out suspended sellers for customer-facing calls.
 *
 * 3. Apply optional filters:
 *    - If `keyword` is provided: use GIN trigram index on `name` field (`ILIKE '%keyword%'` or `@@` operator) for efficient search.
 *    - If `categoryId` is provided: filter `shopping_mall_category_id = categoryId`. Optionally also include subcategories: look up `shopping_mall_categories` where `parent_id = categoryId` and include those IDs as well.
 *    - If `sellerId` is provided: filter `shopping_mall_seller_id = sellerId`.
 *    - If `minPrice` is provided: filter `base_price >= minPrice`.
 *    - If `maxPrice` is provided: filter `base_price <= maxPrice`.
 *
 * 4. Apply sorting: default to `created_at DESC`. Allow sorting by `name ASC/DESC`, `base_price ASC/DESC`, `created_at ASC/DESC`.
 *
 * 5. Apply pagination: use limit/offset based on the requested page number and page size. Default page size is 20, max is 100.
 *
 * 6. LEFT JOIN `shopping_mall_product_images` to get the primary image (lowest `sequence`) for each product for thumbnail display in the summary.
 *
 * 7. LEFT JOIN `shopping_mall_categories` to get the category name for each product.
 *
 * 8. Return the paginated result as `IPageIShoppingMallProduct.ISummary` with:
 *    - `pagination`: total count, current page, page size, total pages.
 *    - `data`: array of product summaries, each including id, name, base_price, category (id + name), seller (id + shop name), primary image URL, created_at.
 *
 * 9. Edge cases:
 *    - If `categoryId` does not exist, return empty results (do not error).
 *    - If `sellerId` does not exist or is suspended, return empty results.
 *    - If no products match, return an empty `data` array with correct pagination metadata.
 * @path /shoppingMall/products
 * @accessor api.functional.shoppingMall.products.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        connection,
        {
          ...index.METADATA,
          path: index.path(props.query),
          status: null,
        },
      );
}
export namespace index {
  export type Props = {
    /**
     * Search criteria, filters, and pagination options as query parameters
     */
    query: IShoppingMallProduct.IRequest;
  };
  export type Response = IPageIShoppingMallProduct.ISummary;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/products",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (query: IShoppingMallProduct.IRequest) => {
    const params = new URLSearchParams();
    if (query.keyword != null) params.set("keyword", query.keyword);
    if (query.categoryId != null) params.set("categoryId", query.categoryId);
    if (query.sellerId != null) params.set("sellerId", query.sellerId);
    if (query.minPrice != null) params.set("minPrice", String(query.minPrice));
    if (query.maxPrice != null) params.set("maxPrice", String(query.maxPrice));
    if (query.createdAfter != null) params.set("createdAfter", query.createdAfter);
    if (query.createdBefore != null) params.set("createdBefore", query.createdBefore);
    if (query.includeDeleted != null) params.set("includeDeleted", String(query.includeDeleted));
    if (query.sort != null) params.set("sort", query.sort);
    if (query.sortDirection != null) params.set("sortDirection", query.sortDirection);
    if (query.page != null) params.set("page", String(query.page));
    if (query.limit != null) params.set("limit", String(query.limit));
    const str = params.toString();
    return str.length ? `/shoppingMall/products?${str}` : `/shoppingMall/products`;
  };
  export const random = (): IPageIShoppingMallProduct.ISummary =>
    typia.random<IPageIShoppingMallProduct.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props.query),
      contentType: "application/json",
    });
    try {
      assert.query(() => typia.assert(props.query));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve the full details of a single product by its unique identifier.
 *
 * This operation returns the complete product information record from the `shopping_mall_products` table, including its name, description, base price, category assignment, and all associated images ordered by their display sequence as configured by the owning seller. The image in the first position (lowest `sequence` value in `shopping_mall_product_images`) is treated as the primary or featured image displayed prominently on the product detail page.
 *
 * The response also includes the seller's shop name (from `shopping_mall_sellers`) and all active product variants (from `shopping_mall_product_variants` where `deleted_at` is null), each with their SKU code, option values (from `shopping_mall_product_variant_options`), and price override if applicable. If a variant has no `price_override`, the product's `base_price` applies for that variant.
 *
 * Customers may only retrieve products that are active (i.e., `deleted_at` is null on `shopping_mall_products`) and whose owning seller is not banned or suspended. Products belonging to suspended sellers are hidden from customer-facing access. Administrators may retrieve any product regardless of deletion or seller suspension status, enabling oversight and historical review as described in the platform-wide product oversight requirements. Sellers may retrieve their own products, including details needed for management.
 *
 * If the product has been assigned to a category (non-null `shopping_mall_category_id`), the category name and parent category information are included in the response. If the product was uncategorized (e.g., after a category was deleted), those fields will be null.
 *
 * Related operations: Use `PATCH /products` to search and list products with filters. Use `GET /products/{productId}/snapshots` to view historical product snapshots. Use `GET /categories/{categoryId}/products` to browse products within a specific category.
 *
 * @param props.connection
 * @param props.productId The unique identifier (UUID) of the product to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification 1. Extract `productId` from the path parameter as a UUID string.
 * 2. Query `shopping_mall_products` by primary key `id = productId`.
 * 3. For customer/public access: verify `deleted_at IS NULL` on the product. If deleted, return 404. Additionally verify the owning seller's `is_banned = false` and `is_suspended = false`; if either is true, return 404 or 403 as appropriate.
 * 4. For admin/superAdmin access: skip deletion and seller status checks — return the product regardless of status.
 * 5. For seller access: verify `shopping_mall_seller_id` matches the authenticated seller's ID; if not, return 403. Allow access even if the product is not yet deleted.
 * 6. JOIN `shopping_mall_sellers` on `shopping_mall_seller_id` to include `shop_name`.
 * 7. JOIN `shopping_mall_categories` on `shopping_mall_category_id` (LEFT JOIN, nullable) to include category name and optional parent category details.
 * 8. Fetch all `shopping_mall_product_images` WHERE `shopping_mall_product_id = productId` ORDER BY `sequence ASC`. Include all images in the response in this order.
 * 9. Fetch all active `shopping_mall_product_variants` WHERE `shopping_mall_product_id = productId AND deleted_at IS NULL`. For each variant, also fetch `shopping_mall_product_variant_options` to include option key-value pairs. Include `sku`, `price_override` (nullable), and `created_at`.
 * 10. Assemble and return the full `IShoppingMallProduct` response object.
 * 11. If the product with the given `productId` does not exist at all (no row in DB), return 404.
 * @path /shoppingMall/products/:productId
 * @accessor api.functional.shoppingMall.products.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * The unique identifier (UUID) of the product to retrieve.
     */
    productId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallProduct;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/products/:productId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/products/${encodeURIComponent(props.productId ?? "null")}`;
  export const random = (): IShoppingMallProduct =>
    typia.random<IShoppingMallProduct>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("productId")(() => typia.assert(props.productId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
