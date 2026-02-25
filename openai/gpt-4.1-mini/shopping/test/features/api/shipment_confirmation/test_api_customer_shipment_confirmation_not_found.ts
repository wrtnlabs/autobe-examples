import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_confirmation_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Generate a random UUID that does not correspond to any shipmentConfirmationId
  const invalidShipmentConfirmationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to get shipment confirmation with invalid ID and expect an error
  await TestValidator.httpError(
    "shipment confirmation not found error",
    404,
    async () => {
      await api.functional.shoppingMall.customer.shipmentConfirmations.at(
        customerConnection,
        { shipmentConfirmationId: invalidShipmentConfirmationId },
      );
    },
  );
}
