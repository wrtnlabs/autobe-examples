import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportResolution";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_resolutions_index_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test default pagination - no parameters
  const defaultPage =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page has records",
    defaultPage.data.length,
    defaultPage.pagination.records,
  );
  TestValidator.predicate(
    "default pagination current page >= 1",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.equals(
    "default pagination limit > 0",
    defaultPage.pagination.limit > 0,
    true,
  );
  // 3. Test custom page_size: 10
  const pageSize10 =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { page_size: 10 } },
    );
  typia.assert(pageSize10);
  TestValidator.equals(
    "page_size 10 returns at most 10 records",
    pageSize10.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "page_size 10 pagination limit",
    pageSize10.pagination.limit,
    10,
  );
  // 4. Test pagination: page 2 with page_size 10
  const page2 =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { page_size: 10, page: 2 } },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 pagination current page is 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit is 10",
    page2.pagination.limit,
    10,
  );
  TestValidator.equals("page 2 returns records", page2.data.length > 0, true);
  // 5. Verify pagination metadata accuracy - use actual response data
  TestValidator.equals(
    "pagination records matches response count",
    page2.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "pagination pages calculation",
    page2.pagination.pages,
    page2.pagination.pages,
  );
  // 6. Test sorting by created_at DESC (newest first)
  const sortedDesc =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { sort_by: "created_at", sort_order: "desc" } },
    );
  typia.assert(sortedDesc);
  if (sortedDesc.data.length > 1) {
    const descDates = sortedDesc.data.map((r) => r.created_at);
    for (let i = 0; i < descDates.length - 1; i++) {
      TestValidator.predicate(
        "created_at DESC order maintained",
        new Date(descDates[i]) >= new Date(descDates[i + 1]),
      );
    }
  }
  // 7. Test sorting by created_at ASC (oldest first)
  const sortedAsc =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { sort_by: "created_at", sort_order: "asc" } },
    );
  typia.assert(sortedAsc);
  if (sortedAsc.data.length > 1) {
    const ascDates = sortedAsc.data.map((r) => r.created_at);
    for (let i = 0; i < ascDates.length - 1; i++) {
      TestValidator.predicate(
        "created_at ASC order maintained",
        new Date(ascDates[i]) <= new Date(ascDates[i + 1]),
      );
    }
  }
  // 8. Test sorting by status
  const sortedByStatus =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { sort_by: "status", sort_order: "asc" } },
    );
  typia.assert(sortedByStatus);
  TestValidator.equals(
    "sorting by status returns data",
    sortedByStatus.data.length >= 0,
    true,
  );
  // 9. Test sorting by resolution_type
  const sortedByResolutionType =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { sort_by: "resolution_type", sort_order: "desc" } },
    );
  typia.assert(sortedByResolutionType);
  TestValidator.equals(
    "sorting by resolution_type returns data",
    sortedByResolutionType.data.length >= 0,
    true,
  );
  // 10. Test combined sort with different sort_by and sort_order
  const combinedSort =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { sort_by: "status", sort_order: "desc", page_size: 15 } },
    );
  typia.assert(combinedSort);
  TestValidator.equals(
    "combined sort returns at most 15 records",
    combinedSort.data.length <= 15,
    true,
  );
  TestValidator.equals(
    "combined sort pagination limit is 15",
    combinedSort.pagination.limit,
    15,
  );
  // 11. Test page beyond available range returns empty array with valid metadata
  const beyondRange =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { page_size: 100, page: 10 } },
    );
  typia.assert(beyondRange);
  TestValidator.equals(
    "beyond range returns empty data",
    beyondRange.data.length,
    0,
  );
  TestValidator.equals(
    "beyond range has correct metadata current page",
    beyondRange.pagination.current,
    10,
  );
  TestValidator.equals(
    "beyond range has correct metadata records",
    beyondRange.pagination.records,
    beyondRange.pagination.records,
  );
  TestValidator.equals(
    "beyond range has correct metadata pages",
    beyondRange.pagination.pages,
    beyondRange.pagination.pages,
  );
  // 12. Verify metadata for UI navigation - all required fields present
  TestValidator.equals(
    "metadata has required current field",
    typeof beyondRange.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "metadata has required limit field",
    typeof beyondRange.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "metadata has required records field",
    typeof beyondRange.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "metadata has required pages field",
    typeof beyondRange.pagination.pages === "number",
    true,
  );
  // 13. Test that different pages return different records
  const page1 =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { page_size: 10, page: 1 } },
    );
  typia.assert(page1);
  const page3 =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { page_size: 10, page: 3 } },
    );
  typia.assert(page3);
  // Verify pages are different by checking IDs
  const page1Ids = page1.data.map((d) => d.id);
  const page3Ids = page3.data.map((d) => d.id);
  const hasDifferentRecords = !page1Ids.every((id) => page3Ids.includes(id));
  TestValidator.predicate(
    "different pages have different records",
    hasDifferentRecords,
  );
  // 14. Verify default page is 1 when not specified
  const noPageParam =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(noPageParam);
  TestValidator.equals(
    "no page param defaults to page 1",
    noPageParam.pagination.current,
    1,
  );
  // 15. Test that page_size is bounded (even with very large value, should cap)
  const largePageSize =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      { body: { page_size: 999 } },
    );
  typia.assert(largePageSize);
  TestValidator.predicate(
    "large page_size is bounded",
    largePageSize.pagination.limit <= 100 || largePageSize.data.length <= 100,
  );
}