import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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

export async function test_api_customer_shipment_tracking_update_empty_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  // Create join input - satisfies pattern for type compatibility with MinLength<1> & Format<"email">
  const joinBody = {
    email: email satisfies string as string &
      tags.MinLength<1> &
      tags.Format<"email">,
    password: "1234",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  // 2. Login with required href and referrer properties
  const loginBody = {
    email: email satisfies string as string &
      tags.MinLength<1> &
      tags.Format<"email">,
    password: "1234",
    href: RandomGenerator.paragraph({
      sentences: 1,
    }) satisfies string as string & tags.Format<"uri">,
    referrer: RandomGenerator.paragraph({
      sentences: 1,
    }) satisfies string as string & tags.Format<"uri">,
  } satisfies IEcommerceMallCustomer.ILogin;
  await authorize_customer_login(customerConnection, {
    body: loginBody,
  });
  // 3. Get customer orders to verify authentication works
  const orders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: { limit: 5 } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(orders);
  // 4. Test shipment update with valid UUID format
  // Since we can't create shipments through available APIs, test with a valid UUID format
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 5. Test update with null values
  await api.functional.ecommerceMall.customer.shipments.update(
    customerConnection,
    {
      shipmentId: shipmentId,
      body: {
        carrier_name: null,
        tracking_number: null,
      } satisfies IEcommerceMallShipment.IUpdate,
    },
  );
  // 6. Test update with empty strings
  await api.functional.ecommerceMall.customer.shipments.update(
    customerConnection,
    {
      shipmentId: shipmentId,
      body: {
        carrier_name: "",
        tracking_number: "",
      } satisfies IEcommerceMallShipment.IUpdate,
    },
  );
  // 7. Test update with partial null values
  await api.functional.ecommerceMall.customer.shipments.update(
    customerConnection,
    {
      shipmentId: shipmentId,
      body: {
        carrier_name: null,
        tracking_number: "ABC123",
      } satisfies IEcommerceMallShipment.IUpdate,
    },
  );
  // 8. Test update with valid values
  await api.functional.ecommerceMall.customer.shipments.update(
    customerConnection,
    {
      shipmentId: shipmentId,
      body: {
        carrier_name: "Test Carrier",
        tracking_number: "TEST123456789",
      } satisfies IEcommerceMallShipment.IUpdate,
    },
  );
}
