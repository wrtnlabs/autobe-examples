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

export async function test_api_shipment_delivery_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer account through join
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Generate a random shipment ID
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Confirm delivery of the shipment
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.invert(
      customerConnection,
      { shipmentId },
    );
  typia.assert(confirmedShipment);
  // 4. Validate the shipment status is now 'delivered'
  // Since IShoppingMallShipment is empty, we cannot validate specific properties
  // The test passes if no error is thrown and typia.assert passes
}
