import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that a customer cannot access the shipping address of another customer's order.
 *
 * This test validates the authorization boundary where customers are isolated from
 * each other's orders. The system validates order ownership before returning address data,
 * preventing cross-customer information disclosure.
 *
 * **Test Flow:**
 * 1. Register Customer A (authenticated user attempting unauthorized access)
 * 2. Register Customer B (creates an order whose address will be the target)
 * 3. Create an order as Customer B with their shipping address
 * 4. Attempt to access Customer B's order address using Customer A's token
 * 5. Verify HTTP 403 Forbidden is returned
 */
export async function test_api_order_address_access_denied_cross_customer(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Customer A (the attacker who will try to access another's order)
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  // Step 2: Register Customer B (the victim who owns the order)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // Step 3: Create an order as Customer B
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerBConnection,
    {},
  );
  typia.assert(order);
  // Step 4: Attempt to access Customer B's order address using Customer A's token
  // This should fail with HTTP 403 Forbidden
  await TestValidator.httpError(
    "Customer A cannot access Customer B's order address",
    403,
    async () => {
      await api.functional.shoppingMall.customer.orders.address.at(
        customerAConnection,
        { orderId: order.id },
      );
    },
  );
}
