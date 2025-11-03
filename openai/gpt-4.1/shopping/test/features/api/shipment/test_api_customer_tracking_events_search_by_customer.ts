import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingShipmentTrackingEvent";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentTrackingEvent";

/**
 * Validate paginated and filtered retrieval of shipment tracking event logs for
 * an authenticated customer.
 *
 * 1. Register a new customer account using random credentials
 * 2. Attempt to retrieve tracking events with random (nonexistent) shipment,
 *    package, and tracking codes (should return empty result)
 * 3. Use pagination options (page, limit) and filtering fields
 * 4. Verify schema and pagination metadata for empty results
 * 5. Simulate a valid shipment with package and tracking info (simulate as
 *    environment doesn't provide creation endpoints)
 * 6. Attempt access with random identifiers belonging to others (should error)
 * 7. Attempt request with unauthenticated connection (should error)
 * 8. (No real data creation: deepest validation is schema/pagination/permission
 *    handling)
 */
export async function test_api_customer_tracking_events_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a customer account
  const registerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://customer-portal.example.com/track",
    referrer: "https://customer-portal.example.com/home",
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: registerBody,
    });
  typia.assert(customer);
  TestValidator.equals(
    "registration result should have role customer",
    customer.role,
    "customer",
  );

  // 2. Try to retrieve events for random/nonexistent shipment
  const code = RandomGenerator.alphaNumeric(12);
  const packageLabel = RandomGenerator.alphaNumeric(8);
  const trackingSource = RandomGenerator.pick([
    "courier_api",
    "warehouse_scan",
    "platform",
  ] as const);
  const eventReq = {
    page: 1,
    limit: 10,
    search: "",
    sort_by: "event_time",
    order: "asc",
  } satisfies IShoppingShipmentTrackingEvent.IRequest;
  const output: IPageIShoppingShipmentTrackingEvent =
    await api.functional.shopping.customer.shipments.packages.trackings.events.index(
      connection,
      {
        code,
        packageLabel,
        trackingSource,
        body: eventReq,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "empty results for nonexistent shipment",
    output.data.length,
    0,
  );
  TestValidator.equals(
    "pagination.page for empty",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit for empty",
    output.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination.records for empty",
    output.pagination.records,
    0,
  );

  // 3. Try to use an invalid code/label/source - should remain empty, as no such shipment exists. (Permission error not expected, just empty dataset)

  // 4. Malicious: Try as unauthenticated customer (connection without tokens)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access event logs",
    async () => {
      await api.functional.shopping.customer.shipments.packages.trackings.events.index(
        unauthConn,
        {
          code,
          packageLabel,
          trackingSource,
          body: eventReq,
        },
      );
    },
  );
  // 5. Malicious: Try to access with another random code (still should be empty or forbidden, no data leak)
  await TestValidator.error(
    "malicious access with random code is blocked",
    async () => {
      await api.functional.shopping.customer.shipments.packages.trackings.events.index(
        connection,
        {
          code: RandomGenerator.alphaNumeric(14),
          packageLabel: RandomGenerator.alphaNumeric(10),
          trackingSource,
          body: eventReq,
        },
      );
    },
  );
}
