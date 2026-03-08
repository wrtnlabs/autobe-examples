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
 * Test administrator force-refund on a fully paid order.
 *
 * Setup:
 * 1. Create administrator account via join utility
 * 2. Create customer account via join utility
 * 3. Customer creates a shipping address using generation utility
 * 4. Customer completes checkout to create an order with 'paid' status
 *
 * Execution:
 * - Administrator calls force-refund API with a documented reason
 *
 * Validations:
 * - Initial order status is 'paid'
 * - After force-refund, order status changes to 'refunded'
 * - Order ID remains consistent
 */
export async function test_api_order_force_refund_paid_order_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create customer connection and account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Customer creates a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 4. Customer completes checkout (creates order with 'paid' status)
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: { address_id: address.id } },
  );
  typia.assert(order);
  // Verify initial order status is 'paid'
  TestValidator.equals("initial order status is paid", order.status, "paid");
  // 5. Administrator force-refunds the order
  const refundReason = "Dispute resolution - customer complaint verified";
  const refundedOrder =
    await api.functional.shoppingMall.administrator.orders.force_refund.forceRefund(
      adminConnection,
      {
        orderId: order.id,
        body: {
          reason: refundReason,
        } satisfies IShoppingMallOrder.IForceRefund,
      },
    );
  typia.assert(refundedOrder);
  // Validations
  TestValidator.equals(
    "order status is refunded",
    refundedOrder.status,
    "refunded",
  );
  TestValidator.equals("order ID matches", refundedOrder.id, order.id);
}
