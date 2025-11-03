import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingShipment";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipment";

/**
 * Verifies advanced shipment search, filter, pagination, and access control for
 * shopping admin shipment listing.
 *
 * Steps:
 *
 * 1. Register and authenticate as admin via /auth/admin/join.
 * 2. Perform shipment advanced search as admin with composite filters:
 *
 *    - Filter: status and carrier_company
 *    - Pagination: specific page/limit
 *    - Sorting: by scheduled_dispatch_at (asc/desc)
 * 3. Validate:
 *
 *    - Only admin authentication succeeds (access control enforced)
 *    - Shipments in response match all filters
 *    - Pagination metadata matches request and actual data
 *    - Each record exposes required admin-visible fields
 * 4. Test pagination overflow (too-high page)
 * 5. Test search with filters that yield no records
 */
export async function test_api_admin_shipments_advanced_search_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminRole = RandomGenerator.pick([
    "super",
    "support",
    "operator",
  ] as const);
  const adminStatus = RandomGenerator.pick([
    "active",
    "pending",
    "suspended",
  ] as const);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: adminRole,
      status: adminStatus,
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminJoin);
  TestValidator.equals("admin email matches", adminJoin.email, adminEmail);
  TestValidator.equals("admin role matches", adminJoin.role, adminRole);
  TestValidator.equals("admin status matches", adminJoin.status, adminStatus);

  // 2. Search: Compose filters and run advanced search
  // Because we can't insert shipments directly here, run with random filters then validate strictness via response.
  const searchStatus = RandomGenerator.pick([
    "pending",
    "in_transit",
    "delivered",
    "cancelled",
  ] as const);
  const searchCarrier = RandomGenerator.pick([
    "CJ대한통운",
    "FedEx",
    "UPS",
  ] as const);
  const pageNum = 1;
  const limitNum = 5;
  const sortField: IShoppingShipment.IRequest["sort_field"] =
    RandomGenerator.pick([
      "scheduled_dispatch_at",
      "created_at",
      "updated_at",
      "dispatched_at",
      "delivered_at",
    ] as const);
  const sortOrder: IShoppingShipment.IRequest["sort_order"] =
    RandomGenerator.pick(["asc", "desc"] as const);
  const searchReq = {
    page: pageNum as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limitNum as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    status: searchStatus,
    carrier_company: searchCarrier,
    sort_field: sortField,
    sort_order: sortOrder,
  } satisfies IShoppingShipment.IRequest;
  const searchRes = await api.functional.shopping.admin.shipments.index(
    connection,
    {
      body: searchReq,
    },
  );
  typia.assert(searchRes);
  const pagination = searchRes.pagination;
  TestValidator.equals(
    "pagination current page matches",
    pagination.current,
    pageNum,
  );
  TestValidator.equals("pagination limit matches", pagination.limit, limitNum);
  TestValidator.predicate("pagination total pages >= 0", pagination.pages >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  // Validate all results match filters (if present)
  for (const row of searchRes.data) {
    TestValidator.equals("row status matches filter", row.status, searchStatus);
    TestValidator.equals(
      "row carrier_company matches filter",
      row.carrier_company,
      searchCarrier,
    );
    // Fields must exist (summary DTO checks)
    TestValidator.predicate(
      "summary id is string",
      typeof row.id === "string" && row.id.length > 0,
    );
    TestValidator.predicate(
      "summary code is string",
      typeof row.code === "string" && row.code.length > 0,
    );
    TestValidator.predicate(
      "summary status is string",
      typeof row.status === "string" && row.status.length > 0,
    );
    TestValidator.predicate(
      "summary carrier_company is string",
      typeof row.carrier_company === "string" && row.carrier_company.length > 0,
    );
    TestValidator.predicate(
      "summary created_at ISO string",
      typeof row.created_at === "string" && row.created_at.includes("T"),
    );
    TestValidator.predicate(
      "summary shopping_order_id is string",
      typeof row.shopping_order_id === "string" &&
        row.shopping_order_id.length > 0,
    );
    TestValidator.predicate(
      "summary shopping_seller_id is string",
      typeof row.shopping_seller_id === "string" &&
        row.shopping_seller_id.length > 0,
    );
  }

  // 3. Pagination overflow: request page greater than pages
  const overflowSearchReq = {
    ...searchReq,
    page: (pagination.pages + 10) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
  } satisfies IShoppingShipment.IRequest;
  const overflowRes = await api.functional.shopping.admin.shipments.index(
    connection,
    {
      body: overflowSearchReq,
    },
  );
  typia.assert(overflowRes);
  TestValidator.equals(
    "overflow response is empty",
    overflowRes.data.length,
    0,
  );

  // 4. Filter with no matches
  const noMatchSearchReq = {
    ...searchReq,
    status: "definitely_not_a_real_status",
  } satisfies IShoppingShipment.IRequest;
  const noMatchRes = await api.functional.shopping.admin.shipments.index(
    connection,
    {
      body: noMatchSearchReq,
    },
  );
  typia.assert(noMatchRes);
  TestValidator.equals("no match response is empty", noMatchRes.data.length, 0);

  // 5. Access control: try unauthenticated request
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access admin shipment search",
    async () => {
      await api.functional.shopping.admin.shipments.index(unauthConn, {
        body: searchReq,
      });
    },
  );
}
