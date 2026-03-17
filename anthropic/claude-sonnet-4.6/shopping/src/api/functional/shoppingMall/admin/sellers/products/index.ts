import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallProduct } from "../../../../../structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "../../../../../structures/IShoppingMallProduct";

export * as snapshots from "./snapshots/index";

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
 * @param props.connection
 * @param props.sellerId The UUID of the seller whose products are to be listed. Must match the authenticated seller's own ID unless the caller is an administrator.
 * @param props.body Search criteria, filters, sorting, and pagination parameters for retrieving the seller's product list.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification 1. Authenticate the calling principal and determine their role (seller or admin).
 * 2. If the caller is a seller, verify that the `sellerId` path parameter matches the authenticated seller's own ID. If not, reject the request with a 403 Forbidden error.
 * 3. If the caller is an admin, allow access to any sellerId without restriction.
 * 4. Query the `shopping_mall_products` table filtering by `shopping_mall_seller_id = sellerId`.
 * 5. By default, exclude records where `deleted_at IS NOT NULL` (active products only). Admin callers may optionally include deleted products based on a request body flag.
 * 6. Apply search filters from the request body:
 *    a. Keyword search: If a `keyword` is provided, apply a GIN trigram similarity filter on the `name` column.
 *    b. Category filter: If `categoryId` is provided, filter by `shopping_mall_category_id = categoryId`. To support uncategorized products, allow filtering by null category as well.
 *    c. Price range: If `minPrice` or `maxPrice` are provided, filter by `base_price >= minPrice` and/or `base_price <= maxPrice`.
 *    d. Date range: If `createdAfter` or `createdBefore` are provided, filter by `created_at` accordingly.
 * 7. Apply sorting based on the `sort` field in the request (e.g., by `created_at` DESC or ASC, by `name`, by `base_price`). Default sort is `created_at DESC`.
 * 8. Apply pagination using `page` and `limit` parameters from the request body. Compute total count for the pagination metadata.
 * 9. Join with `shopping_mall_categories` to include category name in the summary response if a category is assigned.
 * 10. Return a paginated result object with `pagination` metadata (current page, total pages, total count, page size) and a `data` array of `IShoppingMallProduct.ISummary` objects.
 * 11. Handle edge case: if sellerId does not correspond to any existing seller record, return 404.
 * 12. If no products match the filter criteria, return an empty `data` array with appropriate pagination metadata.
 * @path /shoppingMall/admin/sellers/:sellerId/products
 * @accessor api.functional.shoppingMall.admin.sellers.products.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * The UUID of the seller whose products are to be listed. Must match the authenticated seller's own ID unless the caller is an administrator.
     */
    sellerId: string & tags.Format<"uuid">;

    /**
     * Search criteria, filters, sorting, and pagination parameters for retrieving the seller's product list.
     */
    body: IShoppingMallProduct.IRequest;
  };
  export type Body = IShoppingMallProduct.IRequest;
  export type Response = IPageIShoppingMallProduct.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/admin/sellers/:sellerId/products",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/shoppingMall/admin/sellers/${encodeURIComponent(props.sellerId ?? "null")}/products`;
  export const random = (): IPageIShoppingMallProduct.ISummary =>
    typia.random<IPageIShoppingMallProduct.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("sellerId")(() => typia.assert(props.sellerId));
      assert.body(() => typia.assert(props.body));
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
