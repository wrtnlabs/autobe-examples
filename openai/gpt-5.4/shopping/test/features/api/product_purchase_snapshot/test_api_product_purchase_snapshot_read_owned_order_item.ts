import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";

export async function test_api_product_purchase_snapshot_read_owned_order_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
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
          amount: 10000,
          gateway_provider: "test_gateway",
        },
      },
    );
  typia.assert(paymentAttempt);
  const finalizedPaymentAttempt =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: paymentAttempt.gateway_provider,
          gateway_reference: `gw_${RandomGenerator.alphaNumeric(12)}`,
          failure_reason: null,
          processed_at: new Date().toISOString(),
        } satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(finalizedPaymentAttempt);
  TestValidator.equals(
    "payment attempt finalized amount preserved",
    finalizedPaymentAttempt.amount,
    paymentAttempt.amount,
  );
  const orders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orders);
  TestValidator.predicate(
    "customer has at least one order after successful payment",
    orders.data.length > 0,
  );
  const matchedOrder = orders.data.find(
    (order) => order.total_price === paymentAttempt.amount,
  );
  TestValidator.predicate(
    "one order matches the successful payment amount",
    matchedOrder !== undefined,
  );
  const targetOrder = matchedOrder!;
  const orderItems =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: targetOrder.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItems);
  TestValidator.predicate(
    "matched order has at least one item",
    orderItems.data.length > 0,
  );
  const targetItem = orderItems.data[0]!;
  const snapshot =
    await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.getByOrderidAndItemid(
      customerConnection,
      {
        orderId: targetOrder.id,
        itemId: targetItem.id,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot belongs to requested order item",
    snapshot.orderItem.id,
    targetItem.id,
  );
  TestValidator.equals(
    "snapshot unit price matches embedded order item unit price",
    snapshot.unit_price,
    snapshot.orderItem.unit_price,
  );
  TestValidator.equals(
    "snapshot embedded order item unit price matches listed item",
    snapshot.orderItem.unit_price,
    targetItem.unit_price,
  );
  TestValidator.equals(
    "snapshot embedded order item quantity matches listed item",
    snapshot.orderItem.quantity,
    targetItem.quantity,
  );
  TestValidator.equals(
    "snapshot embedded order item status matches listed item",
    snapshot.orderItem.status,
    targetItem.status,
  );
  TestValidator.predicate(
    "snapshot product name preserved",
    snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot product description preserved",
    snapshot.product_description.length > 0,
  );
  TestValidator.predicate(
    "snapshot sku code preserved",
    snapshot.sku_code.length > 0,
  );
  TestValidator.equals(
    "snapshot option values sorted by display order",
    snapshot.optionValues.map((value) => value.display_order),
    [...snapshot.optionValues]
      .sort((a, b) => a.display_order - b.display_order)
      .map((value) => value.display_order),
  );
  for (const optionValue of snapshot.optionValues) {
    TestValidator.equals(
      "option value belongs to the same snapshot",
      optionValue.productPurchaseSnapshot.id,
      snapshot.id,
    );
  }
  if (snapshot.productVariant !== null) {
    TestValidator.equals(
      "traceability variant sku matches snapshot sku",
      snapshot.productVariant.sku_code,
      snapshot.sku_code,
    );
  }
}
