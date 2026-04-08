import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_cancellation_requests_patch_by_orderitemid } from "../../../generate/generate_random_mall_platform_customer_order_items_cancellation_requests_patch_by_orderitemid";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

export async function test_api_cancellation_request_reject_shipped_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test rejection of a cancellation request for a shipped order item.
   *
   * Verifies that the customer cancellation flow refuses shipped items and leaves
   * the historical order state intact. The scenario focuses on the business rule
   * that only paid, unshipped items may enter the cancellation workflow.
   *
   * 1. Register and authenticate a customer account using the provided utility.
   * 2. Load one of the customer's orders and locate a shipped item.
   * 3. Attempt to create a cancellation request for that shipped item.
   * 4. Confirm the request is rejected and the order/item state remains unchanged.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(12)}@example.com` satisfies string &
          tags.Format<"email">,
      password: "P@ssw0rd1234" satisfies string & tags.Format<"password">,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: authorized.id,
    },
  );
  typia.assert(order);
  const shippedItem = order.orderItems.find(
    (item) => item.status === "shipped",
  );
  TestValidator.predicate(
    "a shipped order item must exist to validate rejection behavior",
    shippedItem !== undefined,
  );
  if (shippedItem === undefined) return;
  const targetOrderId = order.id;
  const targetItemId = shippedItem.id;
  const beforeOrderStatus = order.status;
  const beforeShipmentCount = order.shipments.length;
  const beforeItemStatus = shippedItem.status;
  const beforeItemQuantity = shippedItem.quantity;
  const beforeShipmentIds = order.shipments.map((shipment) => shipment.id);
  await TestValidator.httpError(
    "cancellation request for a shipped item must be rejected",
    [400, 409, 422],
    async () => {
      await api.functional.mallPlatform.customer.orderItems.cancellationRequests.patchByOrderitemid(
        customerConnection,
        {
          orderItemId: targetItemId,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMallPlatformCancellationRequest.ICreate,
        },
      );
    },
  );
  const afterOrder = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: targetOrderId,
    },
  );
  typia.assert(afterOrder);
  TestValidator.equals(
    "order id should remain the same",
    afterOrder.id,
    targetOrderId,
  );
  TestValidator.equals(
    "overall order status should remain unchanged",
    afterOrder.status,
    beforeOrderStatus,
  );
  TestValidator.equals(
    "shipment count should remain unchanged",
    afterOrder.shipments.length,
    beforeShipmentCount,
  );
  TestValidator.equals(
    "shipment ids should remain unchanged",
    afterOrder.shipments.map((shipment) => shipment.id),
    beforeShipmentIds,
  );
  const afterItem = afterOrder.orderItems.find(
    (item) => item.id === targetItemId,
  );
  TestValidator.predicate(
    "the shipped order item should still be present after rejection",
    afterItem !== undefined,
  );
  if (afterItem !== undefined) {
    TestValidator.equals(
      "item status should remain shipped",
      afterItem.status,
      beforeItemStatus,
    );
    TestValidator.equals(
      "item quantity should remain unchanged",
      afterItem.quantity,
      beforeItemQuantity,
    );
    TestValidator.equals(
      "item order linkage should remain unchanged",
      afterItem.order.id,
      targetOrderId,
    );
  }
}
