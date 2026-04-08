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

export async function test_api_report_resolutions_index_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test basic listing with no filters
  const basicResponse =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(basicResponse);
  // Verify pagination structure
  typia.assert(basicResponse.pagination);
  // 3. Test filtering by status
  const resolvedResponse =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      {
        body: { status: "resolved" },
      },
    );
  typia.assert(resolvedResponse);
  for (const resolution of resolvedResponse.data) {
    TestValidator.equals(
      "resolved resolution status",
      resolution.status,
      "resolved",
    );
  }
  // 4. Test filtering by resolution_type
  const dismissedResponse =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      {
        body: { resolution_type: "dismissed" },
      },
    );
  typia.assert(dismissedResponse);
  for (const resolution of dismissedResponse.data) {
    TestValidator.equals(
      "dismissed resolution type",
      resolution.resolution_type,
      "dismissed",
    );
  }
  // 5. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      {
        body: {
          created_at_from: oneWeekAgo.toISOString(),
          created_at_to: now.toISOString(),
        },
      },
    );
  typia.assert(dateRangeResponse);
  // Validate date filtering when data exists
  if (dateRangeResponse.data.length > 0) {
    for (const resolution of dateRangeResponse.data) {
      TestValidator.predicate(
        "resolution created within range",
        new Date(resolution.created_at) >= oneWeekAgo &&
          new Date(resolution.created_at) <= now,
      );
    }
  }
  // 6. Test sorting by created_at DESC (default)
  const descResponse =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      {
        body: { sort_by: "created_at", sort_order: "desc" },
      },
    );
  typia.assert(descResponse);
  // 7. Test sorting by created_at ASC
  const ascResponse =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      {
        body: { sort_by: "created_at", sort_order: "asc" },
      },
    );
  typia.assert(ascResponse);
  // 8. Test sorting by status
  const statusSortResponse =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      {
        body: { sort_by: "status" },
      },
    );
  typia.assert(statusSortResponse);
  // 9. Test sorting by resolution_type
  const typeSortResponse =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      {
        body: { sort_by: "resolution_type" },
      },
    );
  typia.assert(typeSortResponse);
  // 10. Test empty result handling
  const emptyResponse =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      {
        body: {
          status: "resolved",
          created_at_from: "2000-01-01T00:00:00.000Z",
        },
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty results have empty data array",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty results total_count is 0",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pages is 0",
    emptyResponse.pagination.pages,
    0,
  );
  // 11. Test page_size limit
  const pageSizeResponse =
    await api.functional.redditCommunity.admin.report_resolutions.index(
      adminConnection,
      {
        body: { page_size: 100 },
      },
    );
  typia.assert(pageSizeResponse);
  TestValidator.predicate(
    "page_size limit respected",
    pageSizeResponse.data.length <= 100,
  );
  // 12. Verify required fields in resolution records using typia.assert
  if (basicResponse.data.length > 0) {
    // typia.assert(basicResponse.data[0]); // Already validated above when validating response
    // Optional fields may or may not be present - typia.assert handles this
  }
}
