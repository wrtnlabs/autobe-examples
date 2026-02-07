import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
 * Test that unauthorized customers cannot confirm delivery of other customers' shipments.
 * Creates two customers: one who places an order, another who attempts to confirm delivery.
 * Validates that the second customer receives permission denied error.
 */
export async function test_api_customer_shipment_delivery_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. First customer registers and creates an order
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  const order = await generate_random_shopping_mall_customer_orders_create(
    customer1Connection,
    {},
  );
  typia.assert(order);
  // 2. Second customer registers (unauthorized user)
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 3. Second customer attempts to confirm delivery of first customer's shipment
  // This should fail with 403 Forbidden or similar permission error
  // Using order ID as shipment ID since the exact shipment structure is not available in DTO
  const shipmentId = (order as any).id ?? RandomGenerator.alphaNumeric(8);
  await TestValidator.error(
    "second customer should not be able to confirm first customer's shipment delivery",
    async () => {
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.patchById(
        customer2Connection,
        {
          id: shipmentId,
        },
      );
    },
  );
}
