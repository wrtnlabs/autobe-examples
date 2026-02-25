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

export async function test_api_customer_shipment_confirmation_success(
  connection: api.IConnection,
) {
  // Step 1: Register customer and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
    },
  });
  typia.assert(authorizedCustomer);
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // Step 2: Prepare confirmed_at timestamp
  const confirmedAt = new Date().toISOString();
  // Step 3: Update the shipment confirmation with delivery confirmation
  const updatedShipmentConfirmation =
    await api.functional.shoppingMall.customer.shipmentConfirmations.updateDeliveryConfirmation(
      customerConnection,
      {
        body: {
          confirmed_at: confirmedAt,
        } satisfies IShoppingMallShipmentConfirmation.IUpdate,
      },
    );
  // Step 4: Validate response
  typia.assert(updatedShipmentConfirmation);
  // Step 5: Verify confirmedAt matches input
  TestValidator.equals(
    "Shipment confirmation confirmedAt matches",
    updatedShipmentConfirmation.confirmedAt,
    confirmedAt,
  );
  // Step 6: Verify related shipment status is "delivered"
  TestValidator.equals(
    "Shipment status is delivered",
    updatedShipmentConfirmation.shipment.status,
    "delivered",
  );
  // Step 7: Test unauthorized access denied
  await TestValidator.error(
    "Unauthorized patch shipment confirmation should be denied",
    async () => {
      const unauthorizedConnection: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.customer.shipmentConfirmations.updateDeliveryConfirmation(
        unauthorizedConnection,
        {
          body: {
            confirmed_at: confirmedAt,
          } satisfies IShoppingMallShipmentConfirmation.IUpdate,
        },
      );
    },
  );
}
