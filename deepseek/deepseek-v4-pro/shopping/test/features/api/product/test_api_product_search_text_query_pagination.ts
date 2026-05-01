import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test text-based product search with pagination and response validation.
 *
 * Validates the complete product search workflow including customer authentication,
 * fuzzy text matching, and paginated response structure. Verifies that the search
 * endpoint correctly applies pagination parameters, returns proper metadata, and
 * sorts results by newest first.
 *
 * 1. Customer registers and authenticates via join on a dedicated connection.
 * 2. Performs a fuzzy text search with page 1, limit 5, and newest-first sort.
 * 3. Validates pagination metadata: current page, limit, records, and page count.
 * 4. Confirms data array length does not exceed the requested limit.
 * 5. When multiple results are returned, verifies descending created_at order.
 */
export async function test_api_product_search_text_query_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search with text query, pagination, and sort
  const result =
    await api.functional.shoppingMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3),
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
          sort: "newest",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 5);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.equals(
    "pages calculation",
    result.pagination.pages,
    Math.ceil(result.pagination.records / 5),
  );
  // 4. Validate data length
  TestValidator.predicate("data length <= limit", result.data.length <= 5);
  // 5. Validate sort order (newest first)
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      TestValidator.predicate(
        "sorted by newest first",
        result.data[i - 1].created_at >= result.data[i].created_at,
      );
    }
  }
}
