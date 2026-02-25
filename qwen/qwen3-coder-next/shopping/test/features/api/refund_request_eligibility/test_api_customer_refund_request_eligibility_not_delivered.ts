import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemStatusLog";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemStatusLog";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusLog";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_customer_order_items_refund_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_request_create";
import { prepare_random_shopping_mall_order_refund_request } from "../../../prepare/prepare_random_shopping_mall_order_refund_request";

export async function test_api_customer_refund_request_eligibility_not_delivered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@test.com",
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve an existing order to test refund eligibility
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    { orderId },
  );
  typia.assert(order);
  // 3. Find an order item that is NOT in "delivered" status
  const nonDeliveredItem = order.orderItems.find(
    (item) => item.itemStatus !== "delivered",
  );
  if (!nonDeliveredItem) {
    TestValidator.predicate(
      "at least one non-delivered item should exist for testing",
      order.orderItems.length > 0,
    );
    return;
  }
  // 4. Verify item status is not "delivered"
  TestValidator.notEquals(
    "item status should not be delivered",
    nonDeliveredItem.itemStatus,
    "delivered",
  );
  // 5. Try to create refund request for non-delivered item - should fail
  await TestValidator.error(
    "refund request should be rejected for non-delivered item",
    async () => {
      await api.functional.shoppingMall.customer.order_items.refund_request.create(
        customerConnection,
        {
          itemId: nonDeliveredItem.id,
          body: {
            reason: "Wrong size",
          } satisfies IShoppingMallOrderRefundRequest.ICreate,
        },
      );
    },
  );
}
