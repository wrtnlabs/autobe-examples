import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_community_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin user who will moderate no communities
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Update admin connection with token for subsequent requests
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 2. Call reports endpoint with admin who has no moderated communities
  const reportsPage = await api.functional.redditCommunity.admin.reports.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(reportsPage);
  // 3. Validate that reports list is empty for admin without moderated communities
  // This demonstrates the isolation feature - admin should not see any reports
  // from communities they don't moderate
  TestValidator.equals(
    "reports should be empty for admin with no moderated communities",
    reportsPage.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should reflect zero records",
    reportsPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should show zero pages",
    reportsPage.pagination.pages,
    0,
  );
  // 4. Verify response structure is valid even with empty data
  typia.assert(reportsPage.data);
  typia.assert(reportsPage.pagination);
  // 5. Test with status filter - should still return empty
  const reportsFilteredPage =
    await api.functional.redditCommunity.admin.reports.index(adminConnection, {
      body: {
        status_id: "0", // pending status
      },
    });
  typia.assert(reportsFilteredPage);
  TestValidator.equals(
    "filtered reports should also be empty",
    reportsFilteredPage.data.length,
    0,
  );
}
