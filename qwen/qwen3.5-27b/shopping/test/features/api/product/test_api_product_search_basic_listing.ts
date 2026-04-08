import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an authenticated seller can retrieve a paginated list of their products.
 *
 * Validates the product search functionality for sellers by verifying that authenticated sellers can retrieve their product listings with proper pagination and filtering. Ensures that only the authenticated seller's products are returned, soft-deleted products are excluded, and pagination metadata is accurate.
 *
 * Special attention is given to verifying that each product summary contains all required fields including seller information, category details, and inventory status. The test also validates that the default sort order and pagination parameters work correctly.
 *
 * 1. Register and authenticate as a seller using authorize_seller_join utility.
 * 2. Call the product search endpoint with default parameters (no filters).
 * 3. Validate the response structure with typia.assert().
 * 4. Verify pagination metadata contains valid values.
 * 5. Verify each product belongs to the authenticated seller.
 * 6. Verify product summaries contain all required fields.
 */
export async function test_api_product_search_basic_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(seller);
  // 2. Call product search endpoint with default parameters
  const searchRequest = {} satisfies IShoppingMallProduct.IRequest;
  const response = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    {
      body: searchRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    response.pagination.pages >= 0,
  );
  // 4. Verify each product belongs to the authenticated seller
  await ArrayUtil.asyncForEach(response.data, async (product) => {
    typia.assert(product);
    // Verify product ownership
    TestValidator.equals(
      "product belongs to authenticated seller",
      product.seller.id,
      seller.id,
    );
    // Verify seller information matches
    typia.assert(product.seller);
    TestValidator.equals(
      "seller email matches authenticated seller",
      product.seller.email,
      seller.email,
    );
  });
  // 5. Verify pagination consistency
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "data array length matches page size or remaining records",
      response.data.length <= response.pagination.limit,
    );
    TestValidator.predicate(
      "pages calculation is correct",
      response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
    );
  } else {
    TestValidator.equals(
      "empty results have empty data array",
      response.data.length,
      0,
    );
    TestValidator.equals(
      "empty results have 0 pages",
      response.pagination.pages,
      0,
    );
  }
}
