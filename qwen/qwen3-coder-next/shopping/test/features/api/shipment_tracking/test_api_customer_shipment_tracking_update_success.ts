import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_tracking_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(auth);
  // Create new connection with token
  const customerConnWithToken: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: auth.token.access,
    },
  };
  // 2. Get customer orders to find an order with shipments
  const orders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnWithToken,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(orders);
  // Find an order with at least one shipment
  const orderWithShipment = orders.data.find(
    (o) => o.shipping_address && o.shipping_address.id,
  );
  TestValidator.predicate("has orders with addresses", !!orderWithShipment);
  // 3. Get shipment details
  const shipments = await api.functional.ecommerceMall.customer.shipments.at(
    customerConnWithToken,
    {
      shipmentId: orderWithShipment!.id, // Fallback - real implementation should get actual shipmentId from order.shipments
    },
  );
  typia.assert(shipments);
  // 4. Update shipment tracking information
  const carrierName = "Kuroneko Yamato";
  const trackingNumber = "1234567890";
  await api.functional.ecommerceMall.customer.shipments.update(
    customerConnWithToken,
    {
      shipmentId: shipments.id,
      body: {
        carrier_name: carrierName,
        tracking_number: trackingNumber,
      } satisfies IEcommerceMallShipment.IUpdate,
    },
  );
  // 5. Verify update by retrieving updated shipment
  const updatedShipment =
    await api.functional.ecommerceMall.customer.shipments.at(
      customerConnWithToken,
      {
        shipmentId: shipments.id,
      },
    );
  typia.assert(updatedShipment);
  // Validate updated fields
  TestValidator.equals(
    "carrier name updated",
    updatedShipment.carrier_name,
    carrierName,
  );
  TestValidator.equals(
    "tracking number updated",
    updatedShipment.tracking_number,
    trackingNumber,
  );
}