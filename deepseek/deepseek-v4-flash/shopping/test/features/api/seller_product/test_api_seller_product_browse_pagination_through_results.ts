import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can paginate through product search results with cursor-based pagination.
 *
 * Validates the pagination metadata structure and correctness of the product browsing endpoint. Since this endpoint uses cursor-based pagination where the cursor (created_at) is implicit and not exposed as a request parameter, multiple calls with the same parameters return the same first page. The test validates the pagination metadata calculation (current, limit, records, pages) and response structure.
 *
 * 1. Register a seller via `authorize_seller_join` to obtain an authenticated seller connection.
 * 2. Request products with `limit=10` and `sort='newest'`, validating pagination metadata correctness.
 * 3. Validate that pagination.pages is correctly calculated as Math.ceil(records / limit).
 * 4. Request with an empty body (no filters), verifying products are returned.
 */
export async function test_api_seller_product_browse_pagination_through_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Request products with limit=10, sort=newest
  const page = await api.functional.eCommerceMall.seller.products.index(
    sellerConnection,
    {
      body: {
        sort: "newest",
        limit: 10,
      } satisfies IECommerceMallProduct.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", page.pagination.current, 1);
  TestValidator.equals("limit matches", page.pagination.limit, 10);
  TestValidator.predicate("has records", page.pagination.records > 0);
  TestValidator.equals(
    "pages correctly calculated",
    page.pagination.pages,
    Math.ceil(page.pagination.records / page.pagination.limit),
  );
  // 4. Validate response data structure
  TestValidator.predicate("data is array", Array.isArray(page.data));
  if (page.data.length > 0) {
    const product = page.data[0];
    typia.assert(product);
    TestValidator.predicate("product has id", typeof product.id === "string");
    TestValidator.predicate(
      "product has name",
      typeof product.name === "string",
    );
  }
  // 5. Test with empty request body (no filters)
  const allProducts = await api.functional.eCommerceMall.seller.products.index(
    sellerConnection,
    {
      body: {} satisfies IECommerceMallProduct.IRequest,
    },
  );
  typia.assert(allProducts);
  TestValidator.predicate(
    "all products returned with empty filter",
    allProducts.pagination.records > 0,
  );
}
