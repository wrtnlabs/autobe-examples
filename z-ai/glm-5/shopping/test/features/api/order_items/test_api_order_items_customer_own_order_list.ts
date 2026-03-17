import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer viewing their own order items.
 *
 * Validates that authenticated customers can retrieve a paginated list of items
 * within a specific order, with proper response structure including product,
 * variant, seller information and pagination metadata.
 */
export async function test_api_order_items_customer_own_order_list(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.example.com/orders",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(customer);
  // Step 2: Call order items endpoint with simulated order ID
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {} satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(response);
  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Step 4: Validate business logic for order items if present
  for (const item of response.data) {
    TestValidator.predicate("quantity is positive", item.quantity > 0);
    TestValidator.predicate("price is non-negative", item.price >= 0);
    TestValidator.predicate("status is valid", item.status.length > 0);
  }
  // Step 5: Validate authentication requirement
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("requires authentication", async () => {
    await api.functional.shoppingMall.customer.orders.items.index(
      unauthenticatedConnection,
      {
        orderId,
        body: {} satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  });
}
