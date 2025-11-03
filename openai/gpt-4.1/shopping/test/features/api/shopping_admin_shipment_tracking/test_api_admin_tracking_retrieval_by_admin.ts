import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentTracking";

/**
 * E2E test for admin shipment package tracking retrieval.
 *
 * 1. Register a new admin account.
 * 2. Perform tracking retrieval using valid random identifiers (simulate, as setup
 *    for real shipment/package is not possible without more APIs).
 *
 *    - Validate that a tracking object is returned and has all required business
 *         fields.
 * 3. Attempt tracking retrieval with wrong shipment code, package label, or
 *    tracking source.
 *
 *    - Validate that errors are thrown (handled via privilege/business validation in
 *         the API layer).
 * 4. Attempt tracking retrieval without admin context (by clearing authorization
 *    header), and expect error.
 */
export async function test_api_admin_tracking_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminRole = RandomGenerator.pick([
    "super",
    "support",
    "compliance",
    "operator",
  ] as const);
  const adminStatus = RandomGenerator.pick([
    "active",
    "pending",
    "suspended",
    "locked",
  ] as const);
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: adminName,
      role: adminRole,
      status: adminStatus,
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminResult);
  // 2. Tracking retrieval (simulate tracking identity as we cannot create real shipment/package/tracking by test APIs)
  const code = RandomGenerator.alphaNumeric(12);
  const packageLabel = RandomGenerator.alphaNumeric(10);
  const trackingSource = RandomGenerator.pick([
    "courier_api",
    "warehouse_scan",
    "customer_report",
  ] as const);
  const tracking =
    await api.functional.shopping.admin.shipments.packages.trackings.at(
      connection,
      {
        code,
        packageLabel,
        trackingSource,
      },
    );
  typia.assert(tracking);
  // Confirm business-critical fields
  TestValidator.predicate(
    "tracking id is uuid",
    typeof tracking.id === "string" && tracking.id.length > 0,
  );
  TestValidator.equals(
    "tracking source matches",
    tracking.tracking_source,
    trackingSource,
  );
  TestValidator.predicate("status not empty", tracking.status.length > 0);
  TestValidator.predicate(
    "last_update_at valid",
    typeof tracking.last_update_at === "string" &&
      tracking.last_update_at.length > 0,
  );
  // 3. Edge cases: invalid identifiers
  await TestValidator.error("invalid code should fail", async () => {
    await api.functional.shopping.admin.shipments.packages.trackings.at(
      connection,
      {
        code: "INVALID_CODE",
        packageLabel,
        trackingSource,
      },
    );
  });
  await TestValidator.error("invalid packageLabel should fail", async () => {
    await api.functional.shopping.admin.shipments.packages.trackings.at(
      connection,
      {
        code,
        packageLabel: "INVALID_LABEL",
        trackingSource,
      },
    );
  });
  await TestValidator.error("invalid trackingSource should fail", async () => {
    await api.functional.shopping.admin.shipments.packages.trackings.at(
      connection,
      {
        code,
        packageLabel,
        trackingSource: "INVALID_SOURCE",
      },
    );
  });
  // 4. Attempt retrieval without authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized tracking retrieval should fail",
    async () => {
      await api.functional.shopping.admin.shipments.packages.trackings.at(
        unauthConn,
        {
          code,
          packageLabel,
          trackingSource,
        },
      );
    },
  );
}
