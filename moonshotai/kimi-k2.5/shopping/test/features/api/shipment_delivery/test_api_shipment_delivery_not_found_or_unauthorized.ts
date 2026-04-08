import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipment_delivery_not_found_or_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Step 2: Create and authenticate second customer
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Step 3: Generate a random shipment ID that does not exist
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Test that accessing non-existent shipment returns an error
  await TestValidator.error(
    "non-existent shipment should throw error",
    async () => {
      await api.functional.ecommerceMall.customer.shipments.delivery.at(
        customer1Connection,
        { shipmentId: nonExistentShipmentId },
      );
    },
  );
  // Step 5: Test that second customer also cannot access non-existent shipment
  await TestValidator.error(
    "non-existent shipment for different customer should throw error",
    async () => {
      await api.functional.ecommerceMall.customer.shipments.delivery.at(
        customer2Connection,
        { shipmentId: nonExistentShipmentId },
      );
    },
  );
}
