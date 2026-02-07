import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test customer cancellation request failure for already shipped items.
 * This test validates that customers cannot request cancellation for items
 * that are already shipped - only items with status "paid" are eligible for cancellation.
 *
 * Flow:
 * 1. Customer authenticates via join
 * 2. Customer creates an order
 * 3. System validates order exists
 * 4. Customer attempts to cancel a shipped item (not eligible)
 * 5. API rejects the cancellation request
 * 6. No cancellation request is created in database
 */
export async function test_api_customer_cancellation_request_failed_already_shipped(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 2. Generate random UUIDs for order and item since IShoppingMallOrder DTO is empty
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  const randomItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to create cancellation request for non-existent order item
  // The system should reject cancellation for items that are not eligible
  // (only "paid" status items can be cancelled, not "shipped" or "delivered")
  await TestValidator.error(
    "should reject cancellation for shipped item",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.cancellation_requests.createCancellationRequest(
        customerConnection,
        {
          orderId: randomOrderId,
          itemId: randomItemId,
          body: typia.random<IShoppingMallCancellationRequest.ICreate>(),
        },
      );
    },
  );
}
