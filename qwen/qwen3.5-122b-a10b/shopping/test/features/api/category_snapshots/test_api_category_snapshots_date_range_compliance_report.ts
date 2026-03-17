import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_snapshots_date_range_compliance_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.assert<IEcommerceMallAdmin.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    }),
  });
  typia.assert(adminAuth);
  // 2. Get current time for date range queries
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 24 hours ago
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours in future
  // 3. Test date range filtering - query snapshots within the time window
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.category_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_from: past.toISOString(),
          created_at_to: future.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 4. Verify temporal accuracy - all snapshots should be within the date range
  TestValidator.predicate("all snapshots within date range", () =>
    dateRangeResult.data.every(
      (snapshot) =>
        new Date(snapshot.created_at) >= past &&
        new Date(snapshot.created_at) <= future,
    ),
  );
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination records count",
    dateRangeResult.pagination.records,
    dateRangeResult.data.length,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    dateRangeResult.pagination.pages >= 0,
  );
  // 6. Verify snapshot integrity - each snapshot should have valid category and admin references
  await ArrayUtil.asyncForEach(dateRangeResult.data, async (snapshot) => {
    TestValidator.predicate(
      "snapshot has valid category",
      snapshot.category !== null,
    );
    TestValidator.predicate(
      "snapshot has valid category id",
      snapshot.category.id !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid category name",
      snapshot.category.name !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid admin",
      snapshot.admin !== null,
    );
    TestValidator.predicate(
      "snapshot has valid admin id",
      snapshot.admin.id !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid admin email",
      snapshot.admin.email !== undefined,
    );
  });
  // 7. Test admin_id combined with date range filtering
  const adminFilteredResult =
    await api.functional.ecommerceMall.admin.category_snapshots.index(
      adminConnection,
      {
        body: {
          admin_id: adminAuth.id,
          created_at_from: past.toISOString(),
          created_at_to: future.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(adminFilteredResult);
  // 8. Verify all snapshots are from the specific admin
  TestValidator.predicate("all snapshots from specific admin", () =>
    adminFilteredResult.data.every(
      (snapshot) => snapshot.admin.id === adminAuth.id,
    ),
  );
  // 9. Test empty results - query a date range with no snapshots
  const veryOldDate = new Date("2000-01-01T00:00:00Z");
  const emptyResult =
    await api.functional.ecommerceMall.admin.category_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_from: veryOldDate.toISOString(),
          created_at_to: veryOldDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 10. Verify empty results have correct pagination
  TestValidator.equals(
    "empty result has 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
  // 11. Verify sorting - results should be sorted by created_at descending
  if (dateRangeResult.data.length > 1) {
    for (let i = 0; i < dateRangeResult.data.length - 1; i++) {
      const current = new Date(dateRangeResult.data[i].created_at);
      const next = new Date(dateRangeResult.data[i + 1].created_at);
      TestValidator.predicate(
        `snapshot ${i} is newer than or equal to snapshot ${i + 1}`,
        current >= next,
      );
    }
  }
  // 12. Test boundary conditions - snapshots at exact boundary timestamps should be included
  // Query with the same created_at_from and created_at_to as a specific snapshot
  if (dateRangeResult.data.length > 0) {
    const targetSnapshot = dateRangeResult.data[0];
    const boundaryResult =
      await api.functional.ecommerceMall.admin.category_snapshots.index(
        adminConnection,
        {
          body: {
            created_at_from: targetSnapshot.created_at,
            created_at_to: targetSnapshot.created_at,
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallCategorySnapshot.IRequest,
        },
      );
    typia.assert(boundaryResult);
    // The snapshot at the exact boundary should be included
    TestValidator.predicate(
      "snapshot at exact boundary timestamp is included",
      boundaryResult.data.some((s) => s.id === targetSnapshot.id),
    );
  }
}