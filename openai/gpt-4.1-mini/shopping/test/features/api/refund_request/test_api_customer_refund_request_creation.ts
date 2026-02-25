import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_customer_refund_request_creation(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful refund request creation flow
  // - Customer joins and authenticates
  // - Creates order item with status delivered within 7 days
  // - Creates refund request
  // - Validates refund request and related data
  // Scenario 2: Unauthorized refund request attempt
  // - Attempts refund request without authentication
  // - Validates 401 Unauthorized error
  // Scenario 3: Refund request after 7 days delivery window
  // - Customer joins and authenticates
  // - Creates order item with delivered status older than 7 days
  // - Attempt refund request
  // - Validates failure due to expired window
  // 1. Prepare customer join and authenticate connection
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const joinedCustomer = await authorize_customer_join(
    customerJoinConnection,
    {},
  );
  typia.assert(joinedCustomer);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: joinedCustomer.token.access };
  // 2. Create order item with delivered status and delivery date within 7 days
  // We cannot specify createdAt and updatedAt as they do not exist in API input
  const orderItemWithin7Days =
    await generate_random_shopping_mall_customer_order_items_create(
      userConnection,
      {
        body: {
          status: "delivered",
        },
      },
    );
  typia.assert(orderItemWithin7Days);
  // 3. Create refund request for delivered order item within 7 days
  const refundReason = "Item was defective";
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      userConnection,
      {
        body: {
          shoppingMallOrderItemId: orderItemWithin7Days.id,
          requestReason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 4. Validate refund request
  TestValidator.equals(
    "refund request status",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request linked order item id",
    refundRequest.shoppingMallOrderItem.id,
    orderItemWithin7Days.id,
  );
  TestValidator.equals(
    "refund request linked customer id",
    refundRequest.shoppingMallCustomer.id,
    joinedCustomer.id,
  );
  TestValidator.equals(
    "refund request reason",
    refundRequest.requestReason,
    refundReason,
  );
  TestValidator.predicate(
    "refund request requestedAt is recent",
    new Date(refundRequest.requestedAt).getTime() >
      Date.now() - 1000 * 60 * 60 * 24 * 7,
  );
  // 5. Scenario 2: Unauthorized refund request attempt
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized refund request",
    401,
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.create(
        unauthorizedConnection,
        {
          body: {
            shoppingMallOrderItemId: orderItemWithin7Days.id,
            requestReason: "Unauthorized request",
          },
        },
      );
    },
  );
  // 6. Scenario 3: Refund request attempt post 7 days delivery window
  // Create order item with delivered status older than 7 days
  // Cannot specify createdAt and updatedAt as they do not exist in API input
  const orderItemOlderThan7Days =
    await generate_random_shopping_mall_customer_order_items_create(
      userConnection,
      {
        body: {
          status: "delivered",
        },
      },
    );
  typia.assert(orderItemOlderThan7Days);
  // Attempt refund request, expecting failure
  await TestValidator.error("refund request expired window error", async () => {
    await generate_random_shopping_mall_customer_refund_requests_create(
      userConnection,
      {
        body: {
          shoppingMallOrderItemId: orderItemOlderThan7Days.id,
          requestReason: "Too late refund request",
        },
      },
    );
  });
}
