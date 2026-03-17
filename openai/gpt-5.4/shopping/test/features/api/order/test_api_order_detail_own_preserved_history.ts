import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";

export async function test_api_order_detail_own_preserved_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Pw1!${RandomGenerator.alphaNumeric(12)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: RandomGenerator.alphaNumeric(8),
        },
      },
    );
  typia.assert(paymentAttempt);
  const processedAt = new Date().toISOString() satisfies string as string &
    tags.Format<"date-time">;
  const gatewayReference = RandomGenerator.alphaNumeric(16);
  const updatedPaymentAttempt =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: paymentAttempt.gateway_provider,
          gateway_reference: gatewayReference,
          failure_reason: null,
          processed_at: processedAt,
        } satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(updatedPaymentAttempt);
  const orderPage = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: 100 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderPage);
  TestValidator.predicate("order page has data", orderPage.data.length > 0);
  const detailedOrders = await ArrayUtil.asyncMap(
    orderPage.data,
    async (summary) => {
      const detail = await api.functional.shoppingMall.customer.orders.at(
        customerConnection,
        {
          orderId: summary.id,
        },
      );
      typia.assert(detail);
      return detail;
    },
  );
  const matchedOrders = detailedOrders.filter(
    (detail) => detail.paymentAttempt?.id === updatedPaymentAttempt.id,
  );
  TestValidator.equals(
    "exactly one order created from successful payment attempt",
    matchedOrders.length,
    1,
  );
  const order = matchedOrders[0];
  TestValidator.equals(
    "order belongs to customer",
    order.customer.id,
    authorized.id,
  );
  const orderSummary = orderPage.data.find(
    (summary) => summary.id === order.id,
  );
  TestValidator.predicate(
    "matching summary exists",
    orderSummary !== undefined,
  );
  if (orderSummary === undefined) {
    throw new Error("Matching order summary not found.");
  }
  const ensuredOrderSummary = orderSummary;
  TestValidator.equals("detail id matches summary", order.id, ensuredOrderSummary.id);
  TestValidator.equals(
    "detail code matches summary",
    order.code,
    ensuredOrderSummary.code,
  );
  TestValidator.equals(
    "detail status matches summary",
    order.status,
    ensuredOrderSummary.status,
  );
  TestValidator.equals(
    "detail total matches summary",
    order.total_price,
    ensuredOrderSummary.total_price,
  );
  TestValidator.equals(
    "address snapshot order id matches",
    order.addressSnapshot.order.id,
    order.id,
  );
  TestValidator.equals(
    "address snapshot summary code matches order",
    order.addressSnapshot.order.code,
    order.code,
  );
  TestValidator.equals(
    "address snapshot summary status matches order",
    order.addressSnapshot.order.status,
    order.status,
  );
  TestValidator.equals(
    "address snapshot summary total matches order",
    order.addressSnapshot.order.total_price,
    order.total_price,
  );
  if (order.paymentAttempt !== null) {
    TestValidator.equals(
      "payment attempt id matches updated",
      order.paymentAttempt.id,
      updatedPaymentAttempt.id,
    );
    TestValidator.equals(
      "payment attempt gateway provider matches",
      order.paymentAttempt.gateway_provider,
      updatedPaymentAttempt.gateway_provider,
    );
    TestValidator.equals(
      "payment attempt gateway reference matches",
      order.paymentAttempt.gateway_reference,
      updatedPaymentAttempt.gateway_reference,
    );
    TestValidator.equals(
      "payment attempt failure reason cleared",
      order.paymentAttempt.failure_reason,
      null,
    );
    TestValidator.equals(
      "payment attempt processed_at matches",
      order.paymentAttempt.processed_at,
      updatedPaymentAttempt.processed_at,
    );
  }
  TestValidator.predicate("order has items", order.items.length > 0);
  await ArrayUtil.asyncForEach(order.items, async (item) => {
    TestValidator.equals("item belongs to same order", item.order.id, order.id);
    TestValidator.equals(
      "item snapshot orderItem id matches",
      item.productPurchaseSnapshot.orderItem.id,
      item.id,
    );
    TestValidator.equals(
      "seller snapshot orderItem id matches",
      item.sellerProfilePurchaseSnapshot.orderItem.id,
      item.id,
    );
    TestValidator.equals(
      "item unit price equals purchase snapshot",
      item.unit_price,
      item.productPurchaseSnapshot.unit_price,
    );
    TestValidator.predicate(
      "product snapshot name non-empty",
      item.productPurchaseSnapshot.product_name.length > 0,
    );
    TestValidator.predicate(
      "product snapshot description non-empty",
      item.productPurchaseSnapshot.product_description.length > 0,
    );
    TestValidator.predicate(
      "product snapshot sku non-empty",
      item.productPurchaseSnapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      "seller purchase snapshot shop name non-empty",
      item.sellerProfilePurchaseSnapshot.shop_name.length > 0,
    );
  });
  await ArrayUtil.asyncForEach(order.shipments, async (shipment) => {
    TestValidator.equals(
      "shipment belongs to same order",
      shipment.order.id,
      order.id,
    );
    TestValidator.equals(
      "tracking info references shipment",
      shipment.trackingInfo.shipment.id,
      shipment.id,
    );
    await ArrayUtil.asyncForEach(shipment.orderItems, async (shipmentItem) => {
      TestValidator.equals(
        "shipment item belongs to order",
        shipmentItem.order.id,
        order.id,
      );
      if (shipmentItem.shipment !== null) {
        TestValidator.equals(
          "shipment item references parent shipment",
          shipmentItem.shipment.id,
          shipment.id,
        );
      }
    });
  });
  await ArrayUtil.asyncForEach(order.items, async (item) => {
    if (item.shipment !== null) {
      const itemShipment = item.shipment;
      TestValidator.predicate(
        "item shipment grouping represented in shipments",
        ArrayUtil.has(
          order.shipments,
          (shipment) => shipment.id === itemShipment.id,
        ),
      );
    }
  });
  const reread = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(reread);
  TestValidator.equals("read only id unchanged", reread.id, order.id);
  TestValidator.equals("read only code unchanged", reread.code, order.code);
  TestValidator.equals(
    "read only status unchanged",
    reread.status,
    order.status,
  );
  TestValidator.equals(
    "read only total price unchanged",
    reread.total_price,
    order.total_price,
  );
  TestValidator.equals(
    "read only created_at unchanged",
    reread.created_at,
    order.created_at,
  );
  TestValidator.equals(
    "read only updated_at unchanged",
    reread.updated_at,
    order.updated_at,
  );
  TestValidator.equals(
    "read only deleted_at unchanged",
    reread.deleted_at,
    order.deleted_at,
  );
  TestValidator.equals(
    "read only item count unchanged",
    reread.items.length,
    order.items.length,
  );
  TestValidator.equals(
    "read only shipment count unchanged",
    reread.shipments.length,
    order.shipments.length,
  );
  TestValidator.equals(
    "read only address snapshot id unchanged",
    reread.addressSnapshot.id,
    order.addressSnapshot.id,
  );
}
