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
 * Test product search with criteria that match no products, validating graceful empty response.
 *
 * Performs a product search with a randomly generated nonsensical search query that is guaranteed to match no existing products in the system. Validates that the search endpoint returns a successful response with proper pagination metadata indicating zero results rather than throwing an error or crashing.
 *
 * 1. Customer authenticates via join using the authorize utility.
 * 2. Customer searches with a random 64-character alphanumeric string that cannot match any product name.
 * 3. Validates pagination shows records=0, pages=0, current=1, limit matches the request, and the data array is empty.
 */
export async function test_api_product_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search with a nonsense query guaranteed to match no products
  const result =
    await api.functional.shoppingMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(64),
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate empty result with proper pagination metadata
  TestValidator.equals("empty search - records", result.pagination.records, 0);
  TestValidator.equals("empty search - pages", result.pagination.pages, 0);
  TestValidator.equals("empty search - current", result.pagination.current, 1);
  TestValidator.equals("empty search - limit", result.pagination.limit, 10);
  TestValidator.equals("empty search - data length", result.data.length, 0);
}
