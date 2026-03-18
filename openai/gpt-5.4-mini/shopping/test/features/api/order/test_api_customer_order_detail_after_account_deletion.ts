import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_detail_after_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const orderList = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderList);
  if (orderList.data.length === 0) return;
  const orderSummary = orderList.data[0];
  const orderBefore = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: orderSummary.id,
    },
  );
  typia.assert(orderBefore);
  const profileBefore = orderBefore.customer;
  const addressBefore = orderBefore.shippingAddress;
  const firstItemBefore = orderBefore.orderItems[0] ?? null;
  const firstShipmentBefore = orderBefore.shipments[0] ?? null;
  const profileAfter =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(profileAfter);
  const orderAfter = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: orderSummary.id,
    },
  );
  typia.assert(orderAfter);
  TestValidator.equals("order id preserved", orderAfter.id, orderBefore.id);
  TestValidator.equals(
    "order number preserved",
    orderAfter.orderNumber,
    orderBefore.orderNumber,
  );
  TestValidator.equals(
    "order status preserved",
    orderAfter.status,
    orderBefore.status,
  );
  TestValidator.equals(
    "order subtotal preserved",
    orderAfter.subtotalAmount,
    orderBefore.subtotalAmount,
  );
  TestValidator.equals(
    "order shipping fee preserved",
    orderAfter.shippingFeeAmount,
    orderBefore.shippingFeeAmount,
  );
  TestValidator.equals(
    "order discount preserved",
    orderAfter.discountAmount,
    orderBefore.discountAmount,
  );
  TestValidator.equals(
    "order total preserved",
    orderAfter.totalAmount,
    orderBefore.totalAmount,
  );
  TestValidator.equals(
    "customer reference preserved",
    orderAfter.customer.id,
    profileBefore.id,
  );
  TestValidator.equals(
    "customer email preserved",
    orderAfter.customer.email,
    profileBefore.email,
  );
  TestValidator.equals(
    "shipping address preserved",
    orderAfter.shippingAddress?.id,
    addressBefore?.id,
  );
  TestValidator.equals(
    "order item count preserved",
    orderAfter.orderItems.length,
    orderBefore.orderItems.length,
  );
  TestValidator.equals(
    "shipment count preserved",
    orderAfter.shipments.length,
    orderBefore.shipments.length,
  );
  if (firstItemBefore !== null && orderAfter.orderItems.length > 0) {
    const firstItemAfter = orderAfter.orderItems[0];
    TestValidator.equals(
      "first order item preserved",
      firstItemAfter.id,
      firstItemBefore.id,
    );
    TestValidator.equals(
      "first order item quantity preserved",
      firstItemAfter.quantity,
      firstItemBefore.quantity,
    );
    TestValidator.equals(
      "first order item status preserved",
      firstItemAfter.status,
      firstItemBefore.status,
    );
    TestValidator.equals(
      "first order item variant preserved",
      firstItemAfter.productVariant.id,
      firstItemBefore.productVariant.id,
    );
  }
  if (firstShipmentBefore !== null && orderAfter.shipments.length > 0) {
    const firstShipmentAfter = orderAfter.shipments[0];
    TestValidator.equals(
      "first shipment preserved",
      firstShipmentAfter.id,
      firstShipmentBefore.id,
    );
    TestValidator.equals(
      "first shipment carrier preserved",
      firstShipmentAfter.carrierName,
      firstShipmentBefore.carrierName,
    );
    TestValidator.equals(
      "first shipment tracking preserved",
      firstShipmentAfter.trackingNumber,
      firstShipmentBefore.trackingNumber,
    );
    TestValidator.equals(
      "first shipment status preserved",
      firstShipmentAfter.status,
      firstShipmentBefore.status,
    );
  }
}
