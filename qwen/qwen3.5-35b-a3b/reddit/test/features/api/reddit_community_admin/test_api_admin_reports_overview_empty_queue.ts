import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportsOverview";
import type { IPaginationMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaginationMetadatum";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReportOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportOverviewItem";
import type { IRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverview";
import type { IRedditCommunityReportsOverviewRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewRequest";
import type { IRedditCommunityReportsOverviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_overview_empty_queue(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with JWT token
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Call overview endpoint with default pagination (empty queue)
  const overview =
    await api.functional.redditCommunity.admin.reports.overview.index(
      adminAuthenticatedConnection,
      {
        body: {} satisfies IRedditCommunityReportsOverviewRequest,
      },
    );
  typia.assert(overview);
  // 4. Validate reports array is empty (data array is empty when no reports)
  TestValidator.equals("reports array is empty", overview.data.length, 0);
  // 5. Validate pagination metadata for empty queue
  // IPage.IPagination uses: current, limit, records, pages (not currentPage, pageSize, etc.)
  TestValidator.equals("current page is 1", overview.pagination.current, 1);
  TestValidator.equals("page limit is 20", overview.pagination.limit, 20);
  TestValidator.equals("total records is 0", overview.pagination.records, 0);
  TestValidator.equals("total pages is 0", overview.pagination.pages, 0);
  // 6. Verify endpoint returns 200 OK with valid structure (no errors)
  TestValidator.predicate(
    "overview has valid structure",
    overview !== null && overview !== undefined,
  );
}
