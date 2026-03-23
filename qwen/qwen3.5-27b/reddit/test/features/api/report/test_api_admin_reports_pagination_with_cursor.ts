import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_pagination_with_cursor(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test cursor-based pagination for admin reports endpoint.
   * Verifies that admin can paginate through reports using cursor tokens,
   * with no duplicates and correct pagination metadata updates.
   */
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
    },
  });
  // 2. First page request with limit
  const firstPageBody = {
    limit: 10,
  } satisfies IRedditCloneReport.IRequest;
  const firstPage = await api.functional.redditClone.admin.reports.index(
    adminConnection,
    {
      body: firstPageBody,
    },
  );
  typia.assert(firstPage);
  // Validate first page structure
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  TestValidator.predicate(
    "first page has total records",
    firstPage.pagination.records > 0,
  );
  // Handle case where there's only one page of data
  if (firstPage.data.length === 0) {
    return;
  }
  // 3. Second page request with cursor
  // Extract the last report's ID to use as cursor for next page
  const lastReportId = firstPage.data[firstPage.data.length - 1].id;
  const secondPageBody = {
    cursor: lastReportId,
    limit: 10,
  } satisfies IRedditCloneReport.IRequest;
  const secondPage = await api.functional.redditClone.admin.reports.index(
    adminConnection,
    {
      body: secondPageBody,
    },
  );
  typia.assert(secondPage);
  // 4. Verify no duplicates between pages
  const firstPageIds = new Set(firstPage.data.map((r) => r.id));
  const hasDuplicate = secondPage.data.some((r) => firstPageIds.has(r.id));
  TestValidator.predicate("no duplicate reports between pages", !hasDuplicate);
  // 5. Verify pagination metadata updates
  TestValidator.equals(
    "second page current is greater than first",
    secondPage.pagination.current,
    firstPage.pagination.current + 1,
  );
  TestValidator.equals(
    "total records consistent across pages",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  // 6. Verify sort order consistency (created_at descending)
  for (let i = 1; i < firstPage.data.length; i++) {
    const prevDate = new Date(firstPage.data[i - 1].createdAt).getTime();
    const currDate = new Date(firstPage.data[i].createdAt).getTime();
    TestValidator.predicate(
      `sort order maintained at index ${i}`,
      prevDate >= currDate,
    );
  }
  // 7. Verify each report has required fields
  for (const report of firstPage.data) {
    TestValidator.predicate(
      "report has reporter with ID",
      report.reporter.id !== undefined,
    );
    TestValidator.predicate(
      "report has community with ID",
      report.community.id !== undefined,
    );
    TestValidator.predicate(
      "report has content type",
      report.contentType === "post" || report.contentType === "comment",
    );
    TestValidator.predicate(
      "report has valid status",
      ["pending", "approved", "dismissed"].includes(report.status),
    );
  }
}
