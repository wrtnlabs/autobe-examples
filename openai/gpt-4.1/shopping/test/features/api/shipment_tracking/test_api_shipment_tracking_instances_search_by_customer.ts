import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingShipmentTracking";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentTracking";

/**
 * Verify that a customer can search and paginate shipment tracking instances
 * for their own packages, but not access tracking for other customers'
 * packages.
 *
 * Steps:
 *
 * 1. Register a new customer and obtain authentication.
 * 2. (Dependency: out of scope - assumes a shipment and package for this customer
 *    exist in the database via test fixture.)
 * 3. Perform a PATCH tracking search using shipment code and package label
 *    (simulate with generated strings, or via test fixture).
 * 4. Provide filters: status, event_start_at, event_end_at, tracking_source.
 * 5. Assert returned tracking instances belong only to the authenticated
 *    customer/package.
 * 6. Attempt to get tracking for codes belonging to a different customer; assert
 *    access is denied.
 */
export async function test_api_shipment_tracking_instances_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain authentication
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://test.com/join",
    referrer: "https://test.com/home",
    ip: undefined,
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerBody });
  typia.assert(customer);

  // 2. (Out of scope) We must use mock/fixed shipment code and packageLabel. Simulate with random strings.
  // In a complete setup, a fixture would create and assign the shipment/package/order.
  const shipmentCode = RandomGenerator.alphaNumeric(16);
  const packageLabel = `PKG-${RandomGenerator.alphabets(10).toUpperCase()}`;

  // 3. Perform PATCH search for tracking as the customer (authorized)
  // Include all major filters.
  const filters = {
    tracking_source: "courier_api",
    status: "in_transit",
    event_start_at: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    event_end_at: new Date().toISOString(),
    sort_by: "last_update_at",
    sort_order: "desc",
    page: 1,
    limit: 20,
  } satisfies IShoppingShipmentTracking.IRequest;
  const trackingPage: IPageIShoppingShipmentTracking =
    await api.functional.shopping.customer.shipments.packages.trackings.index(
      connection,
      {
        code: shipmentCode,
        packageLabel,
        body: filters,
      },
    );
  typia.assert(trackingPage);

  // All tracking instances must relate to the designated package/shipment, which for this test is simulated.
  for (const instance of trackingPage.data) {
    typia.assert(instance);
    TestValidator.predicate(
      "tracking_source matches filter",
      instance.tracking_source === filters.tracking_source,
    );
    TestValidator.predicate(
      "status matches filter",
      instance.status === filters.status,
    );
  }

  // 4. Edge: Use shipment/package from a (simulated) different customer.
  // In a real test, this would be created for a different user; here, just generate unrelated codes.
  const otherShipmentCode = RandomGenerator.alphaNumeric(16);
  const otherPackageLabel = `PKG-${RandomGenerator.alphabets(10).toUpperCase()}`;
  await TestValidator.error(
    "access to unrelated customer's package/shipment must be denied",
    async () => {
      await api.functional.shopping.customer.shipments.packages.trackings.index(
        connection,
        {
          code: otherShipmentCode,
          packageLabel: otherPackageLabel,
          body: filters,
        },
      );
    },
  );
}
