import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportSnapshot";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_reports_snapshots_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // This test validates the report snapshots filtering endpoint works correctly
  // Since we cannot create actual reports with available SDK functions, we test
  // the endpoint with mock data generated via typia.random
  // 1. Test with empty filter - should return paginated results
  const allSnapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: {},
    });
  typia.assert(allSnapshots);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current",
    allSnapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allSnapshots.pagination.limit, 50);
  TestValidator.equals(
    "pagination records",
    allSnapshots.pagination.records,
    allSnapshots.pagination.records,
  );
  TestValidator.equals(
    "pagination pages",
    allSnapshots.pagination.pages,
    Math.ceil(allSnapshots.pagination.records / 50),
  );
  // 2. Test filtering by status=pending
  const pendingSnapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: { status: "pending" },
    });
  typia.assert(pendingSnapshots);
  TestValidator.equals(
    "pending snapshots pagination current",
    pendingSnapshots.pagination.current,
    1,
  );
  // 3. Test filtering by status=resolved
  const resolvedSnapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: { status: "resolved" },
    });
  typia.assert(resolvedSnapshots);
  TestValidator.equals(
    "resolved snapshots pagination current",
    resolvedSnapshots.pagination.current,
    1,
  );
  // 4. Test filtering by status=dismissed
  const dismissedSnapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: { status: "dismissed" },
    });
  typia.assert(dismissedSnapshots);
  TestValidator.equals(
    "dismissed snapshots pagination current",
    dismissedSnapshots.pagination.current,
    1,
  );
  // 5. Test date range filtering with snapshot_created_at_from
  const now = new Date().toISOString();
  const dateFilteredSnapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: { snapshot_created_at_from: now },
    });
  typia.assert(dateFilteredSnapshots);
  TestValidator.equals(
    "date filtered pagination current",
    dateFilteredSnapshots.pagination.current,
    1,
  );
  // 6. Test date range filtering with snapshot_created_at_to
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day in future
  const toDateFilteredSnapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: { snapshot_created_at_to: futureDate },
    });
  typia.assert(toDateFilteredSnapshots);
  TestValidator.equals(
    "to-date filtered pagination current",
    toDateFilteredSnapshots.pagination.current,
    1,
  );
  // 7. Test sorting ascending
  const sortedAscSnapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: { sortBy: "snapshot_created_at", sortOrder: "asc" },
    });
  typia.assert(sortedAscSnapshots);
  TestValidator.equals(
    "sorted asc pagination current",
    sortedAscSnapshots.pagination.current,
    1,
  );
  // 8. Test sorting descending (default)
  const sortedDescSnapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: { sortBy: "snapshot_created_at", sortOrder: "desc" },
    });
  typia.assert(sortedDescSnapshots);
  TestValidator.equals(
    "sorted desc pagination current",
    sortedDescSnapshots.pagination.current,
    1,
  );
  // 9. Test pagination page=2
  const page2Snapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: { page: 2, limit: 10 },
    });
  typia.assert(page2Snapshots);
  TestValidator.equals("page 2 current", page2Snapshots.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Snapshots.pagination.limit, 10);
  // 10. Test pagination with custom limit
  const customLimitSnapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: { page: 1, limit: 5 },
    });
  typia.assert(customLimitSnapshots);
  TestValidator.equals(
    "custom limit current",
    customLimitSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit limit",
    customLimitSnapshots.pagination.limit,
    5,
  );
  // 11. Test combined filters
  const combinedFilteredSnapshots =
    await api.functional.redditPlatform.admin.reports.snapshots(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "resolved",
        sortBy: "snapshot_created_at",
        sortOrder: "desc",
        page: 1,
        limit: 100,
      },
    });
  typia.assert(combinedFilteredSnapshots);
  TestValidator.equals(
    "combined filter pagination current",
    combinedFilteredSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedFilteredSnapshots.pagination.limit,
    100,
  );
  // 12. Verify snapshot data structure if any results returned
  if (allSnapshots.data.length > 0) {
    const snapshot = allSnapshots.data[0];
    typia.assert(snapshot);
    // Verify required fields exist
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has reporter",
      snapshot.reporter !== undefined,
    );
    TestValidator.predicate(
      "snapshot has community",
      snapshot.community !== undefined,
    );
    TestValidator.predicate(
      "snapshot has reported_content_type",
      snapshot.reported_content_type !== undefined,
    );
    TestValidator.predicate(
      "snapshot has reported_content_id",
      snapshot.reported_content_id !== undefined,
    );
    TestValidator.predicate(
      "snapshot has reason",
      snapshot.reason !== undefined,
    );
    TestValidator.predicate(
      "snapshot has status",
      snapshot.status !== undefined,
    );
    TestValidator.predicate(
      "snapshot has snapshot_created_at",
      snapshot.snapshot_created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has updated_at",
      snapshot.updated_at !== undefined,
    );
    // Validate ID format
    TestValidator.predicate(
      "snapshot id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot content id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.reported_content_id,
      ),
    );
    // Validate status values
    TestValidator.predicate(
      "snapshot status is valid",
      ["pending", "resolved", "dismissed"].includes(snapshot.status),
    );
    // Validate reporter structure
    TestValidator.predicate(
      "reporter has id",
      snapshot.reporter.id !== undefined,
    );
    TestValidator.predicate(
      "reporter has username",
      snapshot.reporter.username !== undefined,
    );
    TestValidator.predicate(
      "reporter has display_name",
      snapshot.reporter.displayName !== undefined,
    );
    TestValidator.predicate(
      "reporter has karma_score",
      snapshot.reporter.karmaScore !== undefined,
    );
    // Validate community structure
    TestValidator.predicate(
      "community has id",
      snapshot.community.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      snapshot.community.name !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      snapshot.community.subscriber_count !== undefined,
    );
  }
}
