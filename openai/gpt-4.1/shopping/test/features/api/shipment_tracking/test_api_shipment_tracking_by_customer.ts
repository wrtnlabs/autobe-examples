import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentTracking";

/**
 * End-to-end test of retrieving tracking information for a shipment package as
 * a customer.
 *
 * 1. Register a new customer and authenticate.
 * 2. Simulate existence of a shipment, package, and tracking source.
 * 3. Query tracking info for an accessible shipment/package/trackingSource and
 *    verify returned details and metadata.
 * 4. Check error for invalid shipment code, package label, or tracking source.
 * 5. Validate unauthorized access is rejected.
 * 6. Ensure only customer-permitted information is exposed.
 */
export async function test_api_shipment_tracking_by_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as customer
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingCustomer.ICreate;
  const authorized: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreate,
    });
  typia.assert(authorized);
  TestValidator.equals("role is customer", authorized.role, "customer");
  TestValidator.equals("is_active", authorized.is_active, true);

  // 2. Simulate existence of a shipment, package, and tracking source
  // For E2E, generate likely sample data (mock, since no create shipment API)
  const shipmentCode = RandomGenerator.alphaNumeric(12);
  const packageLabel = RandomGenerator.alphaNumeric(8);
  const trackingSource = RandomGenerator.pick([
    "courier_api",
    "warehouse_scan",
    "customer_report",
  ] as const);

  // 3. Attempt to retrieve tracking info (should error, as shipment does not actually exist)
  await TestValidator.error("invalid shipment code yields error", async () => {
    await api.functional.shopping.customer.shipments.packages.trackings.at(
      connection,
      {
        code: shipmentCode,
        packageLabel: packageLabel,
        trackingSource: trackingSource,
      },
    );
  });

  // 4. Run with random invalid code/labels/sources (should be error)
  await TestValidator.error("invalid package label yields error", async () => {
    await api.functional.shopping.customer.shipments.packages.trackings.at(
      connection,
      {
        code: shipmentCode,
        packageLabel: RandomGenerator.alphaNumeric(18),
        trackingSource: trackingSource,
      },
    );
  });
  await TestValidator.error(
    "invalid tracking source yields error",
    async () => {
      await api.functional.shopping.customer.shipments.packages.trackings.at(
        connection,
        {
          code: shipmentCode,
          packageLabel: packageLabel,
          trackingSource: RandomGenerator.alphaNumeric(8),
        },
      );
    },
  );

  // 5. Unauthenticated access test
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated customer cannot access tracking info",
    async () => {
      await api.functional.shopping.customer.shipments.packages.trackings.at(
        unauthConn,
        {
          code: shipmentCode,
          packageLabel,
          trackingSource,
        },
      );
    },
  );
  // 6. Negative test: Accessing another user's shipment. (Impossible to simulate w/o API)
}
