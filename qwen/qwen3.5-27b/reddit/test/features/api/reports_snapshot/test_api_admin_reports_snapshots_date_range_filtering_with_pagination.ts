import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReportSnapshot";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin report snapshots date range filtering with pagination.
 * 1. Admin authenticates to gain platform-wide access
 * 2. Create date range boundaries (start and end timestamps)
 * 3. Query report snapshots with date range filter
 * 4. Verify all returned snapshots fall within the date range
 * 5. Test pagination by requesting multiple pages
 * 6. Verify pagination metadata matches filtered dataset
 * 7. Test sorting options with status field
 */
export async function test_api_admin_reports_snapshots_date_range_filtering_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  // 2. Create date range boundaries
  const now = new Date();
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  // 3. Query report snapshots with date range filter (page 1)
  const page1 = await api.functional.redditClone.admin.reports_snapshots.index(
    adminConnection,
    {
      body: {
        captured_at_start: startDate.toISOString(),
        captured_at_end: endDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditCloneReportSnapshot.IRequest,
    },
  );
  typia.assert(page1);
  // 4. Verify all snapshots on page 1 fall within the date range
  await ArrayUtil.asyncForEach(page1.data, async (snapshot) => {
    typia.assert(snapshot);
    const snapshotDate = new Date(snapshot.captured_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} captured_at >= start date`,
      snapshotDate >= startDate,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} captured_at <= end date`,
      snapshotDate <= endDate,
    );
  });
  // 5. Test pagination by requesting page 2
  const page2 = await api.functional.redditClone.admin.reports_snapshots.index(
    adminConnection,
    {
      body: {
        captured_at_start: startDate.toISOString(),
        captured_at_end: endDate.toISOString(),
        page: 2,
        limit: 10,
      } satisfies IRedditCloneReportSnapshot.IRequest,
    },
  );
  typia.assert(page2);
  // 6. Verify pagination metadata
  TestValidator.equals(
    "page 1 current page number",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 2 current page number",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 1 limit matches request",
    page1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 limit matches request",
    page2.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    page1.pagination.pages >= 0,
  );
  // 7. Test sorting options with status field
  const sortedByStatus =
    await api.functional.redditClone.admin.reports_snapshots.index(
      adminConnection,
      {
        body: {
          captured_at_start: startDate.toISOString(),
          captured_at_end: endDate.toISOString(),
          page: 1,
          limit: 10,
          sort: "status",
          direction: "asc",
        } satisfies IRedditCloneReportSnapshot.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  // Verify sorting is applied (if multiple snapshots exist)
  if (sortedByStatus.data.length > 1) {
    let isSorted = true;
    for (let i = 1; i < sortedByStatus.data.length; i++) {
      if (sortedByStatus.data[i - 1].status > sortedByStatus.data[i].status) {
        isSorted = false;
        break;
      }
    }
    TestValidator.predicate(
      "snapshots sorted by status in ascending order",
      isSorted,
    );
  }
  // Verify data array length matches limit or is less on final page
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1.data.length <= 10,
  );
  TestValidator.predicate(
    "page 2 data length <= limit",
    page2.data.length <= 10,
  );
}
