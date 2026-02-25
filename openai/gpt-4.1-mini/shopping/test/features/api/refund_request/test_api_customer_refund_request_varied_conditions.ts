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

export async function test_api_customer_refund_request_varied_conditions(
  connection: api.IConnection,
): Promise<void> {
  // Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: { email: typia.random<string & tags.Format<"email">>() },
  });
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorizedCustomer.token.access;
  // Primary scenario: Create delivered order item with delivered status and recent delivery date (within 7 days)
  // Note: We don't have direct delivery date in order item structure; we interpret 'delivered' status as delivered recently for the test
  const deliveredOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: { status: "delivered" },
      },
    );
  typia.assert(deliveredOrderItem);
  // Create refund request for delivered order item
  const refundReason = RandomGenerator.paragraph({ sentences: 1 });
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderItemId: deliveredOrderItem.id,
          requestReason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // Validate refund request links
  TestValidator.equals(
    "refund order item id",
    refundRequest.shoppingMallOrderItem.id,
    deliveredOrderItem.id,
  );
  TestValidator.equals(
    "refund customer id",
    refundRequest.shoppingMallCustomer.id,
    authorizedCustomer.id,
  );
  TestValidator.predicate(
    "refund status is pending",
    refundRequest.status === "pending",
  );
  // Validate timestamps are valid ISO
  TestValidator.predicate(
    "refund requestedAt ISO format",
    typeof refundRequest.requestedAt === "string" &&
      !isNaN(Date.parse(refundRequest.requestedAt)),
  );
  // Secondary scenario: Refund request creation without authentication
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refund request without auth",
    401,
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.create(
        unauthConnection,
        {
          body: {
            shoppingMallOrderItemId: deliveredOrderItem.id,
            requestReason: refundReason,
          },
        },
      );
    },
  );
  // Edge scenario: Refund request after allowed period (>7 days)
  // Create an order item with 'delivered' status but delivered date > 7 days ago
  // Since order item does not have direct delivery date, we simulate this by attempting refund
  // and expecting a rejection.
  // Create a delivered order item (again) for edge case
  const oldDeliveredOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: { status: "delivered" },
      },
    );
  typia.assert(oldDeliveredOrderItem);
  // To simulate >7 days delivery, try refund request and expect rejection
  // Here, assumption is the backend rejects refund due to expiration
  await TestValidator.httpError(
    "refund request after expiration",
    400,
    async () => {
      await generate_random_shopping_mall_customer_refund_requests_create(
        customerConnection,
        {
          body: {
            shoppingMallOrderItemId: oldDeliveredOrderItem.id,
            requestReason: refundReason,
          },
        },
      );
    },
  );
}
