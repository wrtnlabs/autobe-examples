import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";

/**
 * Verify that admin can get detailed shipment package information by code and
 * label, and test error and access control scenarios.
 *
 * 1. Register a new admin account using /auth/admin/join and login as admin (get
 *    token)
 * 2. Create (simulate) or use random valid shipment codes/package labels (cannot
 *    actually create shipments via e2e here), then for each: a. Attempt to
 *    retrieve package by (code, packageLabel) and check:
 *
 *    - Response type matches IShoppingShipmentPackage
 *    - Fields such as status reflect values from ["pending", "shipped", "delivered",
 *         "lost", "damaged"] b. (Optional) For each status, check delivered_at,
 *         lost_at, damaged_at fields for null/non-null correctness
 * 3. Attempt to access a package with a non-existent code/packageLabel; expect
 *    error
 * 4. Log out as admin (clearing token), attempt access – should be denied.
 *
 * For step 2, use several random values for (code, packageLabel), and in
 * absence of a real creation flow, use random values via typia.random where
 * feasible. For errors, expect TestValidator.error to handle rejected calls.
 */
export async function test_api_admin_get_shipment_package_detail_by_code_and_label(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      name: RandomGenerator.name(),
      role: RandomGenerator.pick([
        "super",
        "support",
        "compliance",
        "operator",
      ] as const),
      status: RandomGenerator.pick([
        "active",
        "pending",
        "suspended",
        "locked",
      ] as const),
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. For several random statuses and values, try to retrieve details
  const statuses = [
    "pending",
    "ready",
    "shipped",
    "in_transit",
    "delivered",
    "lost",
    "damaged",
  ] as const;
  for (const status of statuses) {
    const fakePackage: IShoppingShipmentPackage =
      typia.random<IShoppingShipmentPackage>();
    // Overwrite status for scenario coverage
    fakePackage.status = status;
    // Use valid-looking code/label from generated object
    const detail = await api.functional.shopping.admin.shipments.packages.at(
      connection,
      {
        code: fakePackage.shopping_shipment_id,
        packageLabel: fakePackage.package_label,
      },
    );
    typia.assert(detail);
    // Confirm the status matches what we set
    TestValidator.equals(`package status is ${status}`, detail.status, status);
    // For delivered/lost/damaged, check respective timestamp is non-null
    if (status === "delivered") {
      TestValidator.predicate(
        "delivered_at present if delivered",
        detail.delivered_at !== null && detail.delivered_at !== undefined,
      );
    }
    if (status === "lost") {
      TestValidator.predicate(
        "lost_at present if lost",
        detail.lost_at !== null && detail.lost_at !== undefined,
      );
    }
    if (status === "damaged") {
      TestValidator.predicate(
        "damaged_at present if damaged",
        detail.damaged_at !== null && detail.damaged_at !== undefined,
      );
    }
  }

  // 3. Error: Nonexistent code/packageLabel
  await TestValidator.error(
    "error for nonexistent package code/label",
    async () => {
      await api.functional.shopping.admin.shipments.packages.at(connection, {
        code: RandomGenerator.alphaNumeric(24),
        packageLabel: RandomGenerator.alphaNumeric(12),
      });
    },
  );

  // 4. Access control error: try unauthenticated admin (simulate logout by clearing headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated admin denied access", async () => {
    await api.functional.shopping.admin.shipments.packages.at(unauthConn, {
      code: RandomGenerator.alphaNumeric(24),
      packageLabel: RandomGenerator.alphaNumeric(12),
    });
  });
}
