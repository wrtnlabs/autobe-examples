import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingShipmentPackage";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";

/**
 * Validate pagination and filtering of shipment packages as an authenticated
 * admin.
 *
 * 1. Register and authenticate as a new admin account using valid admin join data.
 * 2. Simulate a known shipment code for which packages would exist (since
 *    shipment/package creation is not exposed).
 * 3. Run the package index endpoint with a basic body (no filters). Validate
 *    response shape (pagination, array of summary).
 * 4. Run with status filter (e.g., 'shipped'), and confirm results are properly
 *    filtered (if there is data).
 * 5. Run with tracking number partial search, and confirm results (if data
 *    available).
 * 6. Run with sequence filter (e.g., 0), and confirm results.
 * 7. Run with explicit page/limit parameters. Validate pagination changes
 *    accordingly.
 * 8. Confirm all per-record summary fields match expected formats/types.
 * 9. Validate that package listing can be filtered by status, sequence, or partial
 *    tracking.
 *
 * Note: As actual shipment/package creation is not exposed in the imported API,
 * we use pseudo-random strings for shipment code and rely on the endpoint to
 * return structurally correct mocked data. Key validation is on input types,
 * filter logic, and structure, not actual DB contents.
 */
export async function test_api_admin_list_all_shipment_packages_pagination_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // min 8, max 128
    name: RandomGenerator.name(),
    role: "super", // sample permitted RBAC role
    status: "active",
  } satisfies IShoppingAdmin.IJoin;

  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoin,
    });
  typia.assert(admin);

  // 2. Simulate a valid shipment code
  const shipmentCode = `SHPT-${new Date().getFullYear()}-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;

  // Helper: random status
  const statusSamples = [
    "pending",
    "ready",
    "shipped",
    "in_transit",
    "delivered",
    "lost",
    "damaged",
  ] as const;
  const randomStatus = RandomGenerator.pick(statusSamples);

  // 3. Basic listing (no filter)
  const basicRes = await api.functional.shopping.admin.shipments.packages.index(
    connection,
    {
      code: shipmentCode,
      body: {} satisfies IShoppingShipmentPackage.IRequest,
    },
  );
  typia.assert(basicRes);
  TestValidator.predicate(
    "basic listing returns pagination and array",
    basicRes.pagination !== undefined && Array.isArray(basicRes.data),
  );

  // 4. Filter by status
  const statusRes =
    await api.functional.shopping.admin.shipments.packages.index(connection, {
      code: shipmentCode,
      body: {
        status: randomStatus,
      } satisfies IShoppingShipmentPackage.IRequest,
    });
  typia.assert(statusRes);
  if (statusRes.data.length > 0) {
    for (const pkg of statusRes.data) {
      TestValidator.equals(
        `package status filtered by '${randomStatus}'`,
        pkg.status,
        randomStatus,
      );
    }
  }

  // 5. Filter by partial tracking number (simulate by picking from a returned package)
  let trackingSample: string | undefined;
  if (basicRes.data.length > 0) {
    trackingSample = basicRes.data[0].tracking_number.substring(0, 5);
    const trackingRes =
      await api.functional.shopping.admin.shipments.packages.index(connection, {
        code: shipmentCode,
        body: {
          tracking_number: trackingSample,
        } satisfies IShoppingShipmentPackage.IRequest,
      });
    typia.assert(trackingRes);
    if (trackingRes.data.length > 0) {
      for (const pkg of trackingRes.data) {
        TestValidator.predicate(
          `package tracking number matches '${trackingSample}' (partial match allowed)`,
          pkg.tracking_number.includes(trackingSample!),
        );
      }
    }
  }

  // 6. Filter by sequence (using a sequence from data if available)
  let sequenceSample: number | undefined;
  if (basicRes.data.length > 0) {
    sequenceSample = basicRes.data[0].sequence;
    const seqRes = await api.functional.shopping.admin.shipments.packages.index(
      connection,
      {
        code: shipmentCode,
        body: {
          sequence: sequenceSample,
        } satisfies IShoppingShipmentPackage.IRequest,
      },
    );
    typia.assert(seqRes);
    if (seqRes.data.length > 0) {
      for (const pkg of seqRes.data) {
        TestValidator.equals(
          `package sequence filtered by '${sequenceSample}'`,
          pkg.sequence,
          sequenceSample,
        );
      }
    }
  }

  // 7. Pagination test: page/limit
  const page = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const pagedRes = await api.functional.shopping.admin.shipments.packages.index(
    connection,
    {
      code: shipmentCode,
      body: { page, limit } satisfies IShoppingShipmentPackage.IRequest,
    },
  );
  typia.assert(pagedRes);
  TestValidator.equals(
    "pagination page matches",
    pagedRes.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches",
    pagedRes.pagination.limit,
    limit,
  );

  // 8. Confirm type and structure for all summaries in latest result
  for (const pkg of pagedRes.data) {
    typia.assert(pkg);
    TestValidator.predicate(
      "package id uuid",
      typeof pkg.id === "string" && pkg.id.length > 0,
    );
    TestValidator.predicate(
      "package shipment id uuid",
      typeof pkg.shopping_shipment_id === "string" &&
        pkg.shopping_shipment_id.length > 0,
    );
    TestValidator.predicate(
      "package label non-empty",
      typeof pkg.package_label === "string" && pkg.package_label.length > 0,
    );
    TestValidator.predicate(
      "tracking number non-empty",
      typeof pkg.tracking_number === "string" && pkg.tracking_number.length > 0,
    );
    TestValidator.predicate(
      "status non-empty",
      typeof pkg.status === "string" && pkg.status.length > 0,
    );
    // If delivered_at/lost_at/damaged_at present, check string (nullable OK)
    if (pkg.delivered_at != null) {
      TestValidator.predicate(
        "delivered_at valid string",
        typeof pkg.delivered_at === "string",
      );
    }
    if (pkg.lost_at != null) {
      TestValidator.predicate(
        "lost_at valid string",
        typeof pkg.lost_at === "string",
      );
    }
    if (pkg.damaged_at != null) {
      TestValidator.predicate(
        "damaged_at valid string",
        typeof pkg.damaged_at === "string",
      );
    }
  }
}
