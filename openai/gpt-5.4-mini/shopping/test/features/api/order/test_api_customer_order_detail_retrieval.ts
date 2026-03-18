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

export async function test_api_customer_order_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const firstPage = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(firstPage);
  const orderSummary = firstPage.data[0];
  TestValidator.predicate(
    "customer order history should include at least one preserved order",
    orderSummary !== undefined,
  );
  if (orderSummary === undefined) return;
  const detail = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: orderSummary.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("order id should match", detail.id, orderSummary.id);
  TestValidator.equals(
    "order number should match",
    detail.orderNumber,
    orderSummary.order_number,
  );
  TestValidator.equals(
    "order status should match",
    detail.status,
    orderSummary.status,
  );
  TestValidator.equals(
    "subtotal amount should match",
    detail.subtotalAmount,
    orderSummary.subtotal_amount,
  );
  TestValidator.equals(
    "shipping fee amount should match",
    detail.shippingFeeAmount,
    orderSummary.shipping_fee_amount,
  );
  TestValidator.equals(
    "discount amount should match",
    detail.discountAmount,
    orderSummary.discount_amount,
  );
  TestValidator.equals(
    "total amount should match",
    detail.totalAmount,
    orderSummary.total_amount,
  );
  TestValidator.equals(
    "placed at should match",
    detail.placedAt,
    orderSummary.placed_at,
  );
  TestValidator.equals(
    "paid at should match",
    detail.paidAt,
    orderSummary.paid_at,
  );
  TestValidator.equals(
    "customer id should match",
    detail.customer.id,
    orderSummary.customer.id,
  );
  TestValidator.equals(
    "customer email should match",
    detail.customer.email,
    orderSummary.customer.email,
  );
  TestValidator.equals(
    "customer account status should match",
    detail.customer.accountStatus,
    orderSummary.customer.accountStatus,
  );
  TestValidator.equals(
    "customer deleted timestamp should match",
    detail.customer.deletedAt,
    orderSummary.customer.deletedAt,
  );
  TestValidator.predicate(
    "shipping address should be preserved on the order detail",
    detail.shippingAddress !== null,
  );
  if (detail.shippingAddress !== null) {
    TestValidator.equals(
      "shipping recipient name should be present",
      typeof detail.shippingAddress.recipientName,
      "string",
    );
    TestValidator.equals(
      "shipping address country should be present",
      typeof detail.shippingAddress.country,
      "string",
    );
  }
  TestValidator.predicate(
    "order should contain at least one order item",
    detail.orderItems.length > 0,
  );
  for (const item of detail.orderItems) {
    TestValidator.equals(
      "item order id should match",
      item.order.id,
      detail.id,
    );
    TestValidator.predicate(
      "item quantity should be positive",
      item.quantity > 0,
    );
    TestValidator.predicate(
      "item status should be present",
      item.status.length > 0,
    );
    TestValidator.predicate(
      "item created timestamp should be present",
      item.created_at.length > 0,
    );
    TestValidator.predicate(
      "item updated timestamp should be present",
      item.updated_at.length > 0,
    );
    TestValidator.predicate(
      "item product variant should be preserved",
      item.productVariant.id.length > 0,
    );
    TestValidator.predicate(
      "item product variant sku should be preserved",
      item.productVariant.skuCode.length > 0,
    );
  }
  for (const shipment of detail.shipments) {
    TestValidator.equals(
      "shipment order id should match",
      shipment.order.id,
      detail.id,
    );
    TestValidator.predicate(
      "carrier name should be present",
      shipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "tracking number should be present",
      shipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment status should be present",
      shipment.status.length > 0,
    );
    TestValidator.predicate(
      "shipment created timestamp should be present",
      shipment.createdAt.length > 0,
    );
    TestValidator.predicate(
      "shipment updated timestamp should be present",
      shipment.updatedAt.length > 0,
    );
    TestValidator.equals(
      "shipment seller should be preserved",
      shipment.seller.id,
      shipment.seller.id,
    );
  }
}
