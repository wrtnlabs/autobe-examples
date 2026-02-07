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

export async function test_api_shipment_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer to establish session
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  // 2. Generate a valid UUID for an existing shipment (assuming test data exists)
  const existingShipmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the shipment using the valid ID
  const shipment = await api.functional.shoppingMall.customer.shipments.at(
    customerConnection,
    {
      shipmentId: existingShipmentId,
    },
  );
  // 4. Validate that the response matches the expected type
  typia.assert<IShoppingMallShipment>(shipment);
}
