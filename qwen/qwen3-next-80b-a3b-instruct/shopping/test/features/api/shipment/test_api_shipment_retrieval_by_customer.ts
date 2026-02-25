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

export async function test_api_shipment_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Login as customer
  await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: "1234",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Use random valid UUIDs for order and shipment (simulation mode will validate access)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the shipment as customer
  const retrievedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.at(
      customerConnection,
      {
        orderId,
        shipmentId,
      },
    );
  typia.assert(retrievedShipment);
  // Validate that the response conforms to IShoppingMallShipment.ISummary
  TestValidator.equals(
    "has valid UUID for id",
    Boolean(retrievedShipment.id.match(/^[0-9a-f-]{36}$/i)),
    true,
  );
  TestValidator.predicate(
    "carrier name is a string",
    () => typeof retrievedShipment.carrier_name === "string"
  );
  TestValidator.predicate(
    "tracking number is a string",
    () => typeof retrievedShipment.tracking_number === "string"
  );
  TestValidator.predicate("shipped_at is ISO datetime", () => {
    const date = new Date(retrievedShipment.shipped_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate(
    "delivered_at is null, string, or undefined",
    () => {
      const deliveredAt = retrievedShipment.delivered_at;
      return (
        deliveredAt === null ||
        deliveredAt === undefined ||
        (typeof deliveredAt === "string" &&
          !isNaN(new Date(deliveredAt).getTime()))
      );
    }
  );
  TestValidator.equals(
    "status is one of the valid values",
    ["shipped", "partially_delivered", "delivered"].includes(
      retrievedShipment.status
    ),
    true,
  );
  TestValidator.predicate(
    "item_count is a positive integer",
    () => Number.isInteger(retrievedShipment.item_count) && retrievedShipment.item_count >= 1
  );
}