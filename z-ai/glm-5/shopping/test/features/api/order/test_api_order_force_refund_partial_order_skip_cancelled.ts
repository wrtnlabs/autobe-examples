import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";

/**
 * Test force-refund on an order verifying that already refunded items are skipped.
 *
 * This test validates that force-refund operation correctly handles orders where
 * items have already been processed (refunded), ensuring idempotent behavior
 * and no duplicate processing.
 *
 * Flow:
 * 1. Administrator and customer setup
 * 2. Customer creates shipping address
 * 3. Customer performs checkout (creates order)
 * 4. Administrator force-refunds the order
 * 5. Administrator force-refunds again (tests skip logic)
 */
export async function test_api_order_force_refund_partial_order_skip_cancelled(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Create shipping address for customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 4. Customer performs checkout to create an order
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: { address_id: address.id } },
  );
  typia.assert(order);
  // Validate initial order status
  TestValidator.equals("initial order status", order.status, "paid");
  // 5. Administrator force-refunds the order (first time)
  const refundedOrder =
    await api.functional.shoppingMall.administrator.orders.force_refund.forceRefund(
      adminConnection,
      {
        orderId: order.id,
        body: {
          reason: "Administrator force-refund: test partial order scenario",
        } satisfies IShoppingMallOrder.IForceRefund,
      },
    );
  typia.assert(refundedOrder);
  // Validate order status after first refund
  TestValidator.equals(
    "order status after first refund",
    refundedOrder.status,
    "refunded",
  );
  // 6. Administrator force-refunds again to test skip logic
  // This tests that already refunded items are skipped without errors
  const refundedOrderAgain =
    await api.functional.shoppingMall.administrator.orders.force_refund.forceRefund(
      adminConnection,
      {
        orderId: order.id,
        body: {
          reason: "Administrator force-refund: skip already refunded items",
        } satisfies IShoppingMallOrder.IForceRefund,
      },
    );
  typia.assert(refundedOrderAgain);
  // Validate order remains in refunded status (idempotent operation)
  TestValidator.equals(
    "order status after second refund",
    refundedOrderAgain.status,
    "refunded",
  );
  // Verify the order ID remains consistent
  TestValidator.equals("order ID consistency", refundedOrderAgain.id, order.id);
}
