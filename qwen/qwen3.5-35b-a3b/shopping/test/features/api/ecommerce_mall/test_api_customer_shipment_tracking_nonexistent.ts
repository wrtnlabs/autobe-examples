import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_tracking_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: RandomGenerator.alphaNumeric(12),
      href: "http://test.local/register",
      referrer: "http://test.local",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Test with completely non-existent shipment ID
  const invalidShipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("non-existent shipment returns 404", async () => {
    const customerConnection2: api.IConnection = { host: connection.host };
    customerConnection2.headers = {
      Authorization: customerAuth.token.access,
    };
    await api.functional.ecommerceMall.customer.orders.shipments.at(
      customerConnection2,
      {
        orderId: customerAuth.id,
        shipmentId: invalidShipmentId,
      },
    );
  });
  // 3. Test with non-existent order ID but valid shipment ID pattern
  const nonExistentOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const validShipmentIdPattern: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("non-existent order returns 404", async () => {
    const customerConnection3: api.IConnection = { host: connection.host };
    customerConnection3.headers = {
      Authorization: customerAuth.token.access,
    };
    await api.functional.ecommerceMall.customer.orders.shipments.at(
      customerConnection3,
      {
        orderId: nonExistentOrderId,
        shipmentId: validShipmentIdPattern,
      },
    );
  });
}
