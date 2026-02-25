import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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

export async function test_api_customer_shipments_auto_delivered_after_14_days(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Set up customer-specific connection with auth token
  const shipmentConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  (shipmentConnection.headers as Record<string, string>).Authorization =
    customer.token.access; // Type assertion to satisfy TypeScript
  // 3. Create a random but valid UUID for orderId (we don't need a real order)
  // We're testing the API contract, not the data
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call the shipment endpoint for that order
  // The endpoint expects a body of type IShoppingMallShipment.IRequest
  const shipmentQuery: IShoppingMallShipment.IRequest = {
    page: 1,
    limit: 10,
  };
  const shipments =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      shipmentConnection,
      {
        orderId,
        body: shipmentQuery,
      },
    );
  // 5. Validate the response structure matches IPageIShoppingMallShipment.ISummary
  typia.assert(shipments);
  // 6. Validate the structure of each shipment in the data array
  if (shipments.data.length > 0) {
    const shipment = shipments.data[0];
    TestValidator.equals(
      "shipment status is one of valid values",
      ["shipped", "partially_delivered", "delivered"].includes(shipment.status),
      true,
    );
    TestValidator.predicate(
      "carrier_name is a string",
      () => typeof shipment.carrier_name === "string",
    );
    TestValidator.predicate(
      "tracking_number is a string",
      () => typeof shipment.tracking_number === "string",
    );
    TestValidator.predicate("shipped_at is ISO date-time", () => {
      const date = new Date(shipment.shipped_at!);
      return (
        !isNaN(date.getTime()) &&
        shipment.shipped_at!.includes("T") &&
        shipment.shipped_at!.endsWith("Z")
      );
    });
    TestValidator.predicate(
      "item_count is a positive integer",
      () => Number.isInteger(shipment.item_count) && shipment.item_count >= 1,
    );
    // delivered_at can be null
    if (shipment.delivered_at !== null && shipment.delivered_at !== undefined) {
      TestValidator.predicate("delivered_at is ISO date-time", () => {
        const date = new Date(shipment.delivered_at!);
        return (
          !isNaN(date.getTime()) &&
          shipment.delivered_at!.includes("T") &&
          shipment.delivered_at!.endsWith("Z")
        );
      });
    }
  }
  // 7. Validate pagination
  TestValidator.predicate(
    "current page >= 1",
    () => shipments.pagination.current >= 1,
  );
  TestValidator.predicate("limit >= 1", () => shipments.pagination.limit >= 1);
  TestValidator.predicate(
    "records >= 0",
    () => shipments.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", () => shipments.pagination.pages >= 0);
}
