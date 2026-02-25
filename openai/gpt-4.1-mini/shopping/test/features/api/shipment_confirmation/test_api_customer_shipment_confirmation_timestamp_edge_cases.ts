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

export async function test_api_customer_shipment_confirmation_timestamp_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test shipment delivery confirmation with edge case confirmedAt timestamps
  // 1. Register a new customer and prepare customer-specific authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    },
  });
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Define edge case confirmedAt timestamps to test
  const now = new Date();
  const justBeforeNow = new Date(now.getTime() - 1000); // 1 second before now
  const currentTimestamp = new Date(now.getTime()); // exact current time
  const farPast = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  // 3. Prepare array of test timestamps
  const testTimestamps = [justBeforeNow, currentTimestamp, farPast];
  // 4. For each test timestamp, invoke updateDeliveryConfirmation and assert response
  for (const timestamp of testTimestamps) {
    const body = {
      confirmed_at: timestamp.toISOString(),
    } satisfies IShoppingMallShipmentConfirmation.IUpdate;
    const result =
      await api.functional.shoppingMall.customer.shipmentConfirmations.updateDeliveryConfirmation(
        customerConnection,
        { body },
      );
    // Validate the returned shipment confirmation structure
    typia.assert(result);
    // Validate confirmedAt exists and is a valid ISO string and <= now + small buffer
    const confirmedAtTime = new Date(result.confirmedAt).getTime();
    TestValidator.predicate(
      "confirmedAt is valid timestamp",
      !isNaN(confirmedAtTime),
    );
    TestValidator.predicate(
      "confirmedAt is not future",
      confirmedAtTime <= now.getTime() + 1000,
    );
    // shipment id must exist and be a uuid string
    TestValidator.predicate(
      "shipment ID is uuid",
      typeof result.shoppingMallShipmentId === "string" &&
        /^[0-9a-fA-F-]{36}$/.test(result.shoppingMallShipmentId),
    );
    // The shipment object inside must be defined and valid
    TestValidator.predicate(
      "shipment object property exists",
      result.shipment !== null && typeof result.shipment === "object",
    );
    // The status field in shipment must be a string
    TestValidator.predicate(
      "shipment status is string",
      typeof result.shipment.status === "string",
    );
  }
}
