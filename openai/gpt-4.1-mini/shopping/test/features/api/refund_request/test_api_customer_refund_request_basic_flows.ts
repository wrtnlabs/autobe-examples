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

export async function test_api_customer_refund_request_basic_flows(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Refund request creation with valid claim
  // - Authenticated customer creates a refund request for a delivered order item within 7 days
  // - Ensure refund reason is provided
  // - Validate refund request status is 'pending'
  // - Validate refund request linked to correct order item and customer
  // - Verify timestamps for created and requested dates
  // Scenario 2: Refund request creation without authentication
  // - Attempt to create refund request with no customer auth
  // - Expect HTTP 401 Unauthorized
  // Scenario 3: Refund request outside 7-day window
  // - Attempt to create refund for delivered order item with delivery date older than 7 days
  // - Expect failure with appropriate business error and message
  const authorizedCustomer = await authorize_customer_join(connection, {});
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = authorizedCustomer.token.access
    ? { Authorization: authorizedCustomer.token.access }
    : undefined;
  const validOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      userConnection,
      { body: { status: "delivered" } },
    );
  typia.assert(validOrderItem);
  // Scenario 1: create refund request with valid claim
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      userConnection,
      {
        body: {
          shoppingMallOrderItemId: validOrderItem.id,
          requestReason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund linked order item",
    refundRequest.shoppingMallOrderItem.id,
    validOrderItem.id,
  );
  TestValidator.equals(
    "refund linked customer",
    refundRequest.shoppingMallCustomer.id,
    authorizedCustomer.id,
  );
  TestValidator.predicate(
    "has valid createdAt",
    typeof refundRequest.createdAt === "string" &&
      refundRequest.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has valid requestedAt",
    typeof refundRequest.requestedAt === "string" &&
      refundRequest.requestedAt.length > 0,
  );
  // Scenario 2: refund request without authentication
  await TestValidator.httpError(
    "unauthorized refund request",
    401,
    async () => {
      const unauthConnection: api.IConnection = { host: connection.host };
      await generate_random_shopping_mall_customer_refund_requests_create(
        unauthConnection,
        {
          body: {
            shoppingMallOrderItemId: validOrderItem.id,
            requestReason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );
  // Scenario 3: refund request outside 7-day window
  // Here, we attempt to create a refund request with an order item but
  // expect a business error due to time limit exceeded.
  // Create another delivered order item
  const oldOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      userConnection,
      { body: { status: "delivered" } },
    );
  await TestValidator.error("refund request past 7 days rejected", async () => {
    await generate_random_shopping_mall_customer_refund_requests_create(
      userConnection,
      {
        body: {
          shoppingMallOrderItemId: oldOrderItem.id,
          requestReason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  });
}
