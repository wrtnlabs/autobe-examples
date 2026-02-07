import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipment_retrieval_with_authorized_customer(
  connection: api.IConnection,
): Promise<void> {
  // Create first customer (shipment owner)
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer1);
  // Create second customer (unauthorized requester)
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);
  // Generate and use the same shipment ID for both customer1 and customer2 access attempts
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the shipment with customer1's credentials (should succeed if shipment exists)
  const shipment = await api.functional.shoppingMall.customer.shipments.at(
    customer1Connection,
    {
      shipmentId,
    },
  );
  typia.assert(shipment);
  // Attempt to retrieve the same shipment using customer2's credentials
  // This should fail with 404, verifying ownership enforcement
  await TestValidator.httpError(
    "customer cannot access another customer's shipment",
    404,
    async () => {
      await api.functional.shoppingMall.customer.shipments.at(
        customer2Connection,
        {
          shipmentId,
        },
      );
    },
  );
}
