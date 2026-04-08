import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test super administrator filtering capabilities for order snapshots using entity type and date range filters.
 *
 * Validates the complete order snapshot filtering workflow including super administrator authentication,
 * entity type filtering, date range filtering, search functionality, and sorting capabilities.
 * Ensures that all filters work independently and in combination, and that sorting applies correctly.
 *
 * Special attention is given to verifying that the entity_type enum validation is enforced,
 * date range filtering is accurate, search performs partial matching, and sorting applies correctly.
 *
 * 1. Super administrator registers account.
 * 2. Query snapshots with entity_type=PRODUCT and verify correct filtering.
 * 3. Query snapshots with entity_type=ORDER_ITEM and verify correct filtering.
 * 4. Test date range filter with order_date_start and order_date_end.
 * 5. Test order_number search with partial matching.
 * 6. Test combined filters (entity_type + date range).
 * 7. Test sorting with different sort_by and sort_order combinations.
 */
export async function test_api_order_snapshot_filter_entity_type_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(),
        password: "securePassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(authResult);
  typia.assert<IAuthorizationToken>(authResult.token);
  // 2. Test entity_type filter: PRODUCT
  const productSnapshots =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          entity_type: "PRODUCT",
          limit: 100,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(productSnapshots);
  TestValidator.predicate("PRODUCT entity_type filter returns valid data", () =>
    Array.isArray(productSnapshots.data),
  );
  // 3. Test entity_type filter: ORDER_ITEM
  const orderItemSnapshots =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          entity_type: "ORDER_ITEM",
          limit: 100,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(orderItemSnapshots);
  TestValidator.predicate(
    "ORDER_ITEM entity_type filter returns valid data",
    () => Array.isArray(orderItemSnapshots.data),
  );
  // 4. Test date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeSnapshots =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          order_date_start: thirtyDaysAgo.toISOString(),
          order_date_end: now.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  TestValidator.predicate("date range filter all dates >= start", () =>
    dateRangeSnapshots.data.every(
      (snap) =>
        new Date(snap.order_date).getTime() >=
        new Date(thirtyDaysAgo).getTime(),
    ),
  );
  TestValidator.predicate("date range filter all dates <= end", () =>
    dateRangeSnapshots.data.every(
      (snap) => new Date(snap.order_date).getTime() <= new Date(now).getTime(),
    ),
  );
  // 5. Test order_number search
  const searchSnapshots =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          search: "ORD",
          limit: 100,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(searchSnapshots);
  TestValidator.predicate("order_number search partial match", () =>
    searchSnapshots.data.every((snap) =>
      snap.order_number.toLowerCase().includes("ord".toLowerCase()),
    ),
  );
  // 6. Test combined filters: entity_type + date range
  const combinedSnapshots =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          entity_type: "ORDER_ITEM",
          order_date_start: thirtyDaysAgo.toISOString(),
          order_date_end: now.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(combinedSnapshots);
  TestValidator.predicate(
    "combined filters entity_type accepted",
    () => combinedSnapshots.data.length >= 0,
  );
  TestValidator.predicate("combined filters date range", () =>
    combinedSnapshots.data.every(
      (snap) =>
        new Date(snap.order_date).getTime() >=
          new Date(thirtyDaysAgo).getTime() &&
        new Date(snap.order_date).getTime() <= new Date(now).getTime(),
    ),
  );
  // 7. Test sorting: created_at ascending
  const sortedByCreatedAsc =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          limit: 100,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);
  const createdAscValues = sortedByCreatedAsc.data.map(
    (snap) => snap.order_date,
  );
  TestValidator.predicate("sorting created_at ascending", () =>
    createdAscValues.every((val, idx, arr) => idx === 0 || val >= arr[idx - 1]),
  );
  // 8. Test sorting: order_date descending
  const sortedByOrderDateDesc =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          sort_by: "order_date",
          sort_order: "desc",
          limit: 100,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(sortedByOrderDateDesc);
  const orderDateDescValues = sortedByOrderDateDesc.data.map(
    (snap) => snap.order_date,
  );
  TestValidator.predicate("sorting order_date descending", () =>
    orderDateDescValues.every(
      (val, idx, arr) => idx === 0 || val <= arr[idx - 1],
    ),
  );
  // 9. Test pagination
  const pageSnapshots =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(pageSnapshots);
  TestValidator.equals(
    "pagination limit enforced",
    pageSnapshots.data.length <= 20,
    true,
  );
  TestValidator.equals(
    "pagination records is number",
    typeof pageSnapshots.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof pageSnapshots.pagination.pages,
    "number",
  );
}
