import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_administrator_order_items_cancellation_requests_create } from "../../../generate/generate_random_mall_platform_administrator_order_items_cancellation_requests_create";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

export async function test_api_cancellation_request_duplicate_active_request_blocked(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  TestValidator.predicate(
    "order has at least one item",
    order.orderItems.length > 0,
  );
  TestValidator.equals(
    "order item belongs to order",
    orderItem.order.id,
    order.id,
  );
  TestValidator.equals("order item is paid", orderItem.status, "paid");
  const firstReason = RandomGenerator.paragraph({ sentences: 2 });
  const firstRequest =
    await generate_random_mall_platform_administrator_order_items_cancellation_requests_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
        body: {
          reason: firstReason,
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request is linked to target item",
    firstRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "first request reason is preserved",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "first request is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request is unreviewed",
    firstRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "first request review result is empty",
    firstRequest.reviewResult,
    null,
  );
  TestValidator.equals(
    "first request reviewer note is empty",
    firstRequest.reviewerNote,
    null,
  );
  const retryReason = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.httpError(
    "duplicate cancellation request for the same active order item is blocked",
    [400, 409],
    async () => {
      await generate_random_mall_platform_administrator_order_items_cancellation_requests_create(
        customerConnection,
        {
          params: { orderItemId: orderItem.id },
          body: {
            reason: retryReason,
          } satisfies IMallPlatformCancellationRequest.ICreate,
        },
      );
    },
  );
  const refreshedOrder = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(refreshedOrder);
  TestValidator.equals("order id remains stable", refreshedOrder.id, order.id);
  TestValidator.equals(
    "order status remains paid",
    refreshedOrder.status,
    "paid",
  );
  TestValidator.equals(
    "order total remains stable",
    refreshedOrder.totalAmount,
    order.totalAmount,
  );
  TestValidator.equals(
    "order item count remains stable",
    refreshedOrder.orderItems.length,
    order.orderItems.length,
  );
  TestValidator.equals(
    "order item status remains paid after duplicate attempt",
    refreshedOrder.orderItems[0].status,
    "paid",
  );
  TestValidator.equals(
    "order item id remains stable after duplicate attempt",
    refreshedOrder.orderItems[0].id,
    orderItem.id,
  );
  TestValidator.equals(
    "original cancellation request remains pending",
    firstRequest.status,
    "pending",
  );
}
