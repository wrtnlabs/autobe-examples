import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_retrieves_shipment_details(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection for shipment access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Generate realistic shipment data using typia.random()
  const mockShipment = typia.random<IEcommerceMallShipment>();
  // Test retrieving shipment details
  const retrievedShipment =
    await api.functional.ecommerceMall.admin.shipments.at(adminConnection, {
      shipmentId: mockShipment.id,
    });
  typia.assert(retrievedShipment);
  // Validate structure
  TestValidator.equals(
    "shipment ID matches",
    retrievedShipment.id,
    mockShipment.id,
  );
  TestValidator.equals(
    "shipment has seller",
    retrievedShipment.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "shipment has order",
    retrievedShipment.order !== undefined,
    true,
  );
  TestValidator.predicate(
    "seller has ID",
    typeof retrievedShipment.seller.id === "string",
  );
  TestValidator.predicate(
    "order has ID",
    typeof retrievedShipment.order.id === "string",
  );
  TestValidator.predicate(
    "seller has shop name",
    typeof retrievedShipment.seller.shop_name === "string",
  );
  TestValidator.predicate(
    "order has total price",
    typeof retrievedShipment.order.total_price === "number",
  );
}
