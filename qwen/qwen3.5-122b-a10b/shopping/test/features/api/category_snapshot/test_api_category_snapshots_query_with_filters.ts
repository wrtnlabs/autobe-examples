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

/**
 * Test category snapshots query with various filtering criteria.
 *
 * 1. Authentication: Admin must be authenticated before accessing this endpoint
 * 2. Filter by category_id: Query snapshots for a specific category and verify only snapshots for that category are returned
 * 3. Filter by admin_id: Query snapshots created by a specific administrator and verify only their changes are returned
 * 4. Filter by date range: Query snapshots within a created_at date range and verify temporal filtering works correctly
 * 5. Pagination: Verify pagination metadata (current, limit, records, pages) is returned correctly
 * 6. Response structure: Verify each snapshot summary includes id, category (with id and name), admin (with id, email, admin_grade, account_status), created_at, and deleted_at
 * 7. Sorting: Verify results are sorted by created_at descending (newest first) by default
 * 8. Summary view: Verify the response excludes full JSON audit data (previous_values, current_values) to reduce payload size
 */
export async function test_api_category_snapshots_query_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create second admin for admin_id filtering test
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // 3. Query all snapshots without filters (baseline test)
  const allSnapshots =
    await api.functional.ecommerceMall.admin.category_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Validate response structure
  TestValidator.equals(
    "pagination exists",
    allSnapshots.pagination !== undefined,
    true,
  );
  TestValidator.equals("data is array", Array.isArray(allSnapshots.data), true);
  TestValidator.predicate(
    "pagination has current",
    allSnapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    allSnapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    allSnapshots.pagination.pages >= 0,
  );
  // 4. If there are snapshots, test filtering by category_id
  if (allSnapshots.data.length > 0) {
    const firstSnapshot = allSnapshots.data[0];
    typia.assert(firstSnapshot);
    // Filter by category_id
    const categoryFiltered =
      await api.functional.ecommerceMall.admin.category_snapshots.index(
        adminConnection,
        {
          body: {
            category_id: firstSnapshot.category.id,
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallCategorySnapshot.IRequest,
        },
      );
    typia.assert(categoryFiltered);
    // Verify all returned snapshots are for the specified category
    for (const snapshot of categoryFiltered.data) {
      typia.assert(snapshot);
      TestValidator.equals(
        "category matches filter",
        snapshot.category.id,
        firstSnapshot.category.id,
      );
    }
    // 5. Test filtering by admin_id
    const adminFiltered =
      await api.functional.ecommerceMall.admin.category_snapshots.index(
        adminConnection,
        {
          body: {
            admin_id: adminAuth.id,
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallCategorySnapshot.IRequest,
        },
      );
    typia.assert(adminFiltered);
    // Verify all returned snapshots are by the specified admin
    for (const snapshot of adminFiltered.data) {
      typia.assert(snapshot);
      TestValidator.equals(
        "admin matches filter",
        snapshot.admin.id,
        adminAuth.id,
      );
    }
    // 6. Test date range filtering
    const now = new Date();
    const dateRangeFiltered =
      await api.functional.ecommerceMall.admin.category_snapshots.index(
        adminConnection,
        {
          body: {
            created_at_from: new Date(
              now.getTime() - 86400000 * 30,
            ).toISOString(), // 30 days ago
            created_at_to: now.toISOString(),
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallCategorySnapshot.IRequest,
        },
      );
    typia.assert(dateRangeFiltered);
    // Verify all returned snapshots are within the date range
    for (const snapshot of dateRangeFiltered.data) {
      typia.assert(snapshot);
      const snapshotDate = new Date(snapshot.created_at);
      TestValidator.predicate(
        "created_at >= from",
        snapshotDate >= new Date(now.getTime() - 86400000 * 30),
      );
      TestValidator.predicate("created_at <= to", snapshotDate <= now);
    }
    // 7. Test sorting (should be descending by created_at)
    if (allSnapshots.data.length > 1) {
      for (let i = 0; i < allSnapshots.data.length - 1; i++) {
        const current = allSnapshots.data[i];
        const next = allSnapshots.data[i + 1];
        typia.assert(current);
        typia.assert(next);
        TestValidator.predicate(
          "descending order",
          current.created_at >= next.created_at,
        );
      }
    }
    // 8. Verify response structure has required fields
    if (allSnapshots.data.length > 0) {
      const snapshot = allSnapshots.data[0];
      typia.assert(snapshot);
      // Verify id exists
      TestValidator.predicate(
        "id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.id,
        ),
      );
      // Verify category has required fields
      TestValidator.equals(
        "category has id",
        snapshot.category.id !== undefined,
        true,
      );
      TestValidator.equals(
        "category has name",
        snapshot.category.name !== undefined,
        true,
      );
      // Verify admin has required fields
      TestValidator.equals(
        "admin has id",
        snapshot.admin.id !== undefined,
        true,
      );
      TestValidator.equals(
        "admin has email",
        snapshot.admin.email !== undefined,
        true,
      );
      TestValidator.equals(
        "admin has admin_grade",
        snapshot.admin.admin_grade !== undefined,
        true,
      );
      TestValidator.equals(
        "admin has account_status",
        snapshot.admin.account_status !== undefined,
        true,
      );
      // Verify created_at exists and is valid date-time
      TestValidator.predicate(
        "created_at is valid",
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          snapshot.created_at,
        ),
      );
      // Verify deleted_at exists (can be null)
      TestValidator.equals(
        "deleted_at exists",
        snapshot.deleted_at !== undefined,
        true,
      );
      // 9. Verify summary view does NOT include full JSON audit data
      // The snapshot should NOT have previous_values or current_values properties
      const snapshotKeys = Object.keys(snapshot);
      TestValidator.predicate(
        "no previous_values in summary",
        !snapshotKeys.includes("previous_values"),
      );
      TestValidator.predicate(
        "no current_values in summary",
        !snapshotKeys.includes("current_values"),
      );
    }
  }
}
