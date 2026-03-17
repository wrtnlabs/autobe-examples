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

export async function test_api_product_purchase_snapshot_order_item_hierarchy_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string & tags.Format<"password">;
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const firstAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {},
    );
  typia.assert(firstAttempt);
  const firstCompleted =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: firstAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: firstAttempt.gateway_provider,
          gateway_reference: `${firstAttempt.gateway_reference}-${RandomGenerator.alphabets(6)}`,
          failure_reason: null,
          processed_at: new Date().toISOString(),
        } satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(firstCompleted);
  const secondAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {},
    );
  typia.assert(secondAttempt);
  const secondCompleted =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: secondAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: secondAttempt.gateway_provider,
          gateway_reference: `${secondAttempt.gateway_reference}-${RandomGenerator.alphabets(6)}`,
          failure_reason: null,
          processed_at: new Date().toISOString(),
        } satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(secondCompleted);
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
    "customer has at least two orders available",
    orders.data.length >= 2,
  );
  const selectedOrders = orders.data.slice(0, 2);
  TestValidator.equals("selected order count is two", selectedOrders.length, 2);
  TestValidator.notEquals(
    "selected orders are distinct",
    selectedOrders[0].id,
    selectedOrders[1].id,
  );
  const validOrder = selectedOrders[0];
  const mismatchedOrder = selectedOrders[1];
  const validOrderItems =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: validOrder.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(validOrderItems);
  TestValidator.predicate(
    "valid order has at least one item",
    validOrderItems.data.length > 0,
  );
  const targetItem = validOrderItems.data[0];
  const validSnapshot =
    await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.getByOrderidAndItemid(
      customerConnection,
      {
        orderId: validOrder.id,
        itemId: targetItem.id,
      },
    );
  typia.assert(validSnapshot);
  TestValidator.equals(
    "valid snapshot belongs to selected item",
    validSnapshot.orderItem.id,
    targetItem.id,
  );
  TestValidator.notEquals(
    "mismatched order differs from valid order",
    mismatchedOrder.id,
    validOrder.id,
  );
  await TestValidator.httpError(
    "hierarchy mismatch blocks unrelated product snapshot lookup",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.getByOrderidAndItemid(
        customerConnection,
        {
          orderId: mismatchedOrder.id,
          itemId: targetItem.id,
        },
      );
    },
  );
}
