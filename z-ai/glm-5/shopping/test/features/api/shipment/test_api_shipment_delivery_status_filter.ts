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

export async function test_api_shipment_delivery_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - use utility function for registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create shipping address - use utility function
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Create order via checkout - use utility function
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: { address_id: address.id },
    },
  );
  typia.assert(order);
  // 4. Test filter for delivered shipments (delivered: true)
  // Note: New orders may not have shipments yet; shipments are created by sellers
  const deliveredShipments =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: { delivered: true } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(deliveredShipments);
  // Validate: all returned shipments should have delivered_at NOT NULL
  TestValidator.predicate(
    "delivered filter returns only delivered shipments",
    deliveredShipments.data.every((shipment) => shipment.delivered_at !== null),
  );
  // 5. Test filter for in-transit shipments (delivered: false)
  const inTransitShipments =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: { delivered: false } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(inTransitShipments);
  // Validate: all returned shipments should have delivered_at NULL
  TestValidator.predicate(
    "in-transit filter returns only non-delivered shipments",
    inTransitShipments.data.every((shipment) => shipment.delivered_at === null),
  );
  // 6. Test without filter - should return all shipments
  const allShipments =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: {} satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(allShipments);
  // Validate: unfiltered count should equal sum of delivered + in-transit
  TestValidator.equals(
    "unfiltered shipments count equals sum of filtered",
    allShipments.data.length,
    deliveredShipments.data.length + inTransitShipments.data.length,
  );
  // 7. Test pagination with filter
  const paginatedShipments =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          delivered: false,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(paginatedShipments);
  // Validate pagination metadata is valid
  TestValidator.predicate(
    "pagination metadata is valid",
    paginatedShipments.pagination.current >= 1 &&
      paginatedShipments.pagination.limit >= 1 &&
      paginatedShipments.pagination.records >= 0 &&
      paginatedShipments.pagination.pages >= 0,
  );
  // Validate pagination respects delivered filter
  TestValidator.predicate(
    "paginated results respect delivered filter",
    paginatedShipments.data.every((s) => s.delivered_at === null),
  );
}
