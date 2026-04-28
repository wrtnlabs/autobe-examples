import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProduct } from "../../../../../api/structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "../../../../../api/structures/IShoppingMallProduct";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { patchShoppingMallAdminSellersSellerIdProducts } from "../../../../../providers/patchShoppingMallAdminSellersSellerIdProducts";

@Controller("/shoppingMall/admin/sellers/:sellerId/products")
export class ShoppingmallAdminSellersProductsController {
  /**
   * Retrieve a paginated and filtered list of products belonging to a specific seller on the shopping mall platform.
   *
   * This endpoint provides comprehensive search and browsing capabilities over the product catalog owned by a particular seller. It is identified by the `sellerId` path parameter, which references the `shopping_mall_sellers` table primary key. The underlying data is drawn from the `shopping_mall_products` table, filtered by `shopping_mall_seller_id`.
   *
   * The request body accepts rich search criteria including keyword search against product names (supported by a GIN trigram index on the `name` column), category filtering by `shopping_mall_category_id`, base price range constraints, creation date range filtering, and ordering options. Pagination is handled through standard page number and page size parameters.
   *
   * Access control is strictly enforced by ownership. An authenticated seller may only retrieve products associated with their own seller account. Attempting to retrieve another seller's product list will be denied. Administrators, however, have platform-wide oversight and may view products from any seller, including those belonging to suspended sellers. Administrators may also choose to include products that have been removed (where `deleted_at` is not null) for audit and policy enforcement purposes.
   *
   * Products that have been removed are excluded from the default result set for seller-facing requests, as the `deleted_at` field on `shopping_mall_products` marks records for exclusion. Active (non-deleted) products are returned by default. Each item in the paginated result set is a summary representation suitable for list views, omitting verbose fields like full description in favor of essential catalog metadata.
   *
   * This operation is typically used by sellers to manage their product listings from a seller dashboard, and by administrators exercising platform-wide product oversight. Related operations include `GET /sellers/{sellerId}/products/{productId}` to retrieve full product details, `POST /sellers/{sellerId}/products` to create a new product, and `PUT /sellers/{sellerId}/products/{productId}` to update an existing product.
   *
   * @param connection
   * @param sellerId The UUID of the seller whose products are to be listed. Must match the authenticated seller's own ID unless the caller is an administrator.
   * @param body Search criteria, filters, sorting, and pagination parameters for retrieving the seller's product list.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1. Authenticate the calling principal and
     *   determine their role (seller or admin). 2. If the caller is a seller,
     *   verify that the `sellerId` path parameter matches the authenticated
     *   seller's own ID. If not, reject the request with a 403 Forbidden error.
     *   3. If the caller is an admin, allow access to any sellerId without
     *   restriction. 4. Query the `shopping_mall_products` table filtering by
     *   `shopping_mall_seller_id = sellerId`. 5. By default, exclude records
     *   where `deleted_at IS NOT NULL` (active products only). Admin callers
     *   may optionally include deleted products based on a request body flag.
     *   6. Apply search filters from the request body: a. Keyword search: If a
     *   `keyword` is provided, apply a GIN trigram similarity filter on the
     *   `name` column. b. Category filter: If `categoryId` is provided, filter
     *   by `shopping_mall_category_id = categoryId`. To support uncategorized
     *   products, allow filtering by null category as well. c. Price range: If
     *   `minPrice` or `maxPrice` are provided, filter by `base_price >=
     *   minPrice` and/or `base_price <= maxPrice`. d. Date range: If
     *   `createdAfter` or `createdBefore` are provided, filter by `created_at`
     *   accordingly. 7. Apply sorting based on the `sort` field in the request
     *   (e.g., by `created_at` DESC or ASC, by `name`, by `base_price`).
     *   Default sort is `created_at DESC`. 8. Apply pagination using `page` and
     *   `limit` parameters from the request body. Compute total count for the
     *   pagination metadata. 9. Join with `shopping_mall_categories` to include
     *   category name in the summary response if a category is assigned. 10.
     *   Return a paginated result object with `pagination` metadata (current
     *   page, total pages, total count, page size) and a `data` array of
     *   `IShoppingMallProduct.ISummary` objects. 11. Handle edge case: if
     *   sellerId does not correspond to any existing seller record, return 404.
     *   12. If no products match the filter criteria, return an empty `data`
     *   array with appropriate pagination metadata.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("sellerId")
    sellerId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProduct.IRequest,
  ): Promise<IPageIShoppingMallProduct.ISummary> {
    try {
      return await patchShoppingMallAdminSellersSellerIdProducts({
        admin,
        sellerId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
