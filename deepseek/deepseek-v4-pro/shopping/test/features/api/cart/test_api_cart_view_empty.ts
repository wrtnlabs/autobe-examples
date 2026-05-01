import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test viewing an empty shopping cart for a newly registered customer.
 *
 * Validates that the cart view endpoint correctly handles the empty-cart edge
 * case. A newly registered customer who has not added any items to their cart
 * should receive an empty page with accurate pagination metadata reflecting
 * zero records across zero pages.
 *
 * 1. Register and authenticate a new customer via the join utility.
 * 2. Query the cart items endpoint with explicit pagination parameters (limit=20, page=1).
 * 3. Verify pagination metadata: current=1, limit=20, records=0, pages=0.
 * 4. Verify the data array is empty.
 */
export async function test_api_cart_view_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Query the empty cart
  const page = await api.functional.shoppingMall.customer.cart_items.index(
    customerConnection,
    {
      body: {
        limit: 20,
        page: 1,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate empty cart pagination metadata
  TestValidator.equals("pagination.current", page.pagination.current, 1);
  TestValidator.equals("pagination.limit", page.pagination.limit, 20);
  TestValidator.equals("pagination.records", page.pagination.records, 0);
  TestValidator.equals("pagination.pages", page.pagination.pages, 0);
  TestValidator.equals("data is empty", page.data.length, 0);
}
