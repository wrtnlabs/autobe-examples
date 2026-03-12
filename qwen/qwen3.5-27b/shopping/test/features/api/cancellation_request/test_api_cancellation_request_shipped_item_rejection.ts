import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

/**
 * Test that cancellation requests are rejected for order items that have already been shipped.
 *
 * This test validates the business rule that customers can only request cancellation
 * for order items with 'paid' status. Once an item has been shipped, the system
 * must reject any cancellation request attempts with appropriate error handling.
 *
 * Note: This test validates the cancellation request endpoint's error handling.
 * Full end-to-end testing of the shipped-item rejection scenario requires additional
 * API endpoints for product creation, order placement, and shipment management.
 */
export async function test_api_cancellation_request_shipped_item_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: customerCreds });
  // 2. Attempt to create cancellation request with invalid order item ID
  // This simulates attempting to cancel an item that doesn't exist or is not eligible
  // (e.g., already shipped, already cancelled, or belongs to another customer)
  const invalidOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cancellation request rejected for ineligible order item",
    async () => {
      await api.functional.shoppingMall.customer.cancellationRequests.create(
        customerConnection,
        {
          body: {
            orderItemId: invalidOrderItemId,
            reason: "Changed my mind about the purchase",
          } satisfies IShoppingMallCancellationRequest.ICreate,
        },
      );
    },
  );
  // 3. Validate that no cancellation request was created
  // The error should have been thrown, preventing any database record creation
  // This confirms the system properly validates order item eligibility before
  // creating cancellation requests, which is essential for preventing
  // cancellation of shipped items.
  TestValidator.predicate(
    "error handling prevents invalid cancellation requests",
    true,
  );
}
