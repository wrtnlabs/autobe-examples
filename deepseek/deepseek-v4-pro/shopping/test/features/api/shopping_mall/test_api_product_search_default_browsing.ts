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
 * Test default product catalog browsing with no filters applied.
 *
 * Validates that an authenticated customer can browse the complete product catalog using default search parameters. Ensures the API returns a properly paginated response with all required product summary fields populated correctly via typia.assert.
 *
 * The test verifies that the service layer's mandatory visibility filters work as expected — no products from suspended sellers, banned sellers, or unapproved sellers appear in results. Only products from approved sellers in good standing are returned.
 *
 * 1. Customer registers and authenticates via the join endpoint.
 * 2. Searches products with an empty request body to use all defaults.
 * 3. Validates the response structure via typia.assert for complete type safety.
 * 4. Confirms default pagination starts at page 1.
 * 5. Verifies every returned product belongs to an approved, non-suspended, non-banned seller.
 */
export async function test_api_product_search_default_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search products with empty body (default settings)
  const result = await api.functional.shoppingMall.customer.products.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate default pagination starts at page 1
  TestValidator.equals("default page is 1", result.pagination.current, 1);
  // 4. Validate seller visibility rules for every product
  for (const product of result.data) {
    TestValidator.equals(
      "seller is approved",
      product.seller.approval_status,
      "approved",
    );
    TestValidator.equals(
      "seller not suspended",
      product.seller.suspended,
      false,
    );
    TestValidator.equals("seller not banned", product.seller.banned, false);
  }
}
