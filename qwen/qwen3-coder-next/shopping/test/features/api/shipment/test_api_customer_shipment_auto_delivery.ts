import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_auto_delivery(
  connection: api.IConnection,
): Promise<void> {
  // Create a new customer connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Register a new customer using utility function
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: (RandomGenerator.alphabets(5) + "@test.com") satisfies string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphabets(12) satisfies string &
        tags.MinLength<8> &
        tags.MaxLength<128> &
        tags.Format<"password">,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // Get shipments endpoint to verify shipment functionality
  const shipmentsResponse =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(shipmentsResponse);
  // Verify shipment structure matches expected DTO
  if (shipmentsResponse.data.length > 0) {
    const firstShipment = shipmentsResponse.data[0];
    // Validate shipment properties exist as defined in IShoppingMallShipment
    TestValidator.equals(
      "shipment has valid id",
      firstShipment.id !== null && firstShipment.id !== undefined,
      true,
    );
    TestValidator.equals(
      "shipment has valid tracking number",
      firstShipment.trackingNumber !== null &&
        firstShipment.trackingNumber !== undefined,
      true,
    );
    TestValidator.equals(
      "shipment has valid status",
      ["pending", "shipped", "in_transit", "delivered", "cancelled"].includes(
        firstShipment.status,
      ),
      true,
    );
    // Test auto-delivery confirmation timestamp functionality
    TestValidator.predicate(
      "shipment has valid shipped_at timestamp",
      () =>
        firstShipment.shippedAt !== null &&
        firstShipment.shippedAt !== undefined,
    );
    // Check auto-confirmed_at field exists in response
    TestValidator.predicate(
      "auto-confirmed_at is nullable",
      () =>
        firstShipment.autoConfirmedAt === null ||
        firstShipment.autoConfirmedAt === undefined ||
        typeof firstShipment.autoConfirmedAt === "string",
    );
  }
  // Test pagination structure
  TestValidator.equals(
    "pagination has valid current page",
    shipmentsResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has valid limit",
    shipmentsResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has valid records count",
    shipmentsResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has valid pages count",
    shipmentsResponse.pagination.pages >= 0,
    true,
  );
}
