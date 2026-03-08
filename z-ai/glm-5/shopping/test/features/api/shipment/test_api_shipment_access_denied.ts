import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";

/**
 * Test authorization enforcement when a customer attempts to view shipments
 * for another customer's order.
 *
 * Scenario:
 * 1. Register Customer A who will own the order
 * 2. Create a shipping address for Customer A
 * 3. Complete checkout as Customer A to create an order
 * 4. Register Customer B who will attempt unauthorized access
 * 5. As Customer B, attempt to access Customer A's order shipments
 * 6. Verify HTTP error (403 Forbidden or 404 Not Found) is returned
 */
export async function test_api_shipment_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A who will own the order
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerA);
  // 2. Create a shipping address for Customer A
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerAConnection,
    {},
  );
  typia.assert(address);
  // 3. Complete checkout as Customer A to create an order
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerAConnection,
    { body: { address_id: address.id } },
  );
  typia.assert(order);
  // 4. Register Customer B who will attempt unauthorized access
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerB);
  // 5. As Customer B, attempt to access Customer A's order shipments
  // 6. Verify HTTP error (403 Forbidden or 404 Not Found) is returned
  await TestValidator.httpError(
    "should deny access to another customer's order shipments",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.index(
        customerBConnection,
        {
          orderId: order.id,
          body: {},
        },
      );
    },
  );
}
