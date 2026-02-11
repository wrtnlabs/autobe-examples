import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12341234",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Test report sorting with DESC order (newest first)
  const reportRequest: IRedditPlatformReport.IRequest = {
    sortBy: "created_at",
    sortOrder: "DESC",
    page: 1,
    pageSize: 20,
  };
  const result =
    await api.functional.redditPlatform.admin.redditPlatform.reports.index(
      adminConnection,
      {
        body: reportRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.equals("pagination exists", result.pagination !== null, true);
  TestValidator.equals("pagination has current", result.pagination.current, 1);
  TestValidator.equals("pagination has limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", result.pagination.pages >= 0);
  // 4. Validate data array structure
  TestValidator.predicate("has data array", Array.isArray(result.data));
  TestValidator.equals("data count matches limit", result.data.length, 20);
  // 5. Validate sorting order (DESC - newest first)
  if (result.data.length >= 2) {
    const firstDate = new Date(result.data[0].createdAt).getTime();
    const secondDate = new Date(result.data[1].createdAt).getTime();
    TestValidator.predicate(
      "reports sorted by created_at DESC",
      firstDate >= secondDate,
    );
  }
  // 6. Test pagination with second page
  const secondPageRequest: IRedditPlatformReport.IRequest = {
    sortBy: "created_at",
    sortOrder: "DESC",
    page: 2,
    pageSize: 20,
  };
  const secondPageResult =
    await api.functional.redditPlatform.admin.redditPlatform.reports.index(
      adminConnection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPageResult);
  // 7. Validate second page exists and has data
  TestValidator.equals(
    "second page has correct page number",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.predicate(
    "second page has data",
    Array.isArray(secondPageResult.data),
  );
  // 8. Verify reports are different between pages
  if (result.data.length > 0 && secondPageResult.data.length > 0) {
    const firstPageIds = result.data.map((r) => r.id);
    const secondPageIds = secondPageResult.data.map((r) => r.id);
    const hasOverlap = firstPageIds.some((id) => secondPageIds.includes(id));
    TestValidator.predicate("pages are different", !hasOverlap);
  }
  // 9. Test different sort order (ASC - oldest first)
  const ascRequest: IRedditPlatformReport.IRequest = {
    sortBy: "created_at",
    sortOrder: "ASC",
    page: 1,
    pageSize: 20,
  };
  const ascResult =
    await api.functional.redditPlatform.admin.redditPlatform.reports.index(
      adminConnection,
      {
        body: ascRequest,
      },
    );
  typia.assert(ascResult);
  // 10. Validate ASC sorting (oldest first)
  if (ascResult.data.length >= 2) {
    const firstDate = new Date(ascResult.data[0].createdAt).getTime();
    const secondDate = new Date(ascResult.data[1].createdAt).getTime();
    TestValidator.predicate(
      "reports sorted by created_at ASC",
      firstDate <= secondDate,
    );
  }
  // 11. Test with no sorting (default behavior)
  const noSortRequest: IRedditPlatformReport.IRequest = {
    page: 1,
    pageSize: 20,
  };
  const noSortResult =
    await api.functional.redditPlatform.admin.redditPlatform.reports.index(
      adminConnection,
      {
        body: noSortRequest,
      },
    );
  typia.assert(noSortResult);
  TestValidator.equals(
    "no sort has correct pagination",
    noSortResult.pagination.limit,
    20,
  );
}
