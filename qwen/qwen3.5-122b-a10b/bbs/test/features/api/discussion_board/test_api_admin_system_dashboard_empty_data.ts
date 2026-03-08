import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSectionArticleCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArticleCount";
import type { IDiscussionBoardSystemDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemDashboard";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that the system dashboard correctly handles empty platform state with zero counts and proper ratio calculations.
 * The test should verify:
 * 1. Admin authentication succeeds via authorize_admin_join utility function
 * 2. Platform has no data: no members, articles, comments, sections, audit logs, admin requests, or system settings
 * 3. GET /discussionBoard/admin/dashboard/system returns HTTP 200 with consistent structure
 * 4. members.total = 0, members.active = 0, members.banned = 0
 * 5. articles.total = 0, articles.bySection = [] (empty array)
 * 6. comments.total = 0
 * 7. sections.active = 0
 * 8. activity.last24Hours = 0, activity.last7Days = 0, activity.last30Days = 0
 * 9. adminRequests.pending = 0
 * 10. systemSettings.active = 0
 * 11. ratios.articlesPerMember = 0 (handles division by zero correctly)
 * 12. ratios.commentsPerArticle = 0 (handles division by zero correctly)
 * 13. Response structure remains consistent even with no data
 *
 * This validates the edge case where the platform is freshly initialized with no activity,
 * ensuring the dashboard doesn't crash or return inconsistent data.
 */
export async function test_api_admin_system_dashboard_empty_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Call system dashboard endpoint with admin connection
  const dashboard =
    await api.functional.discussionBoard.admin.dashboard.system.systemOverview(
      adminConnection,
    );
  typia.assert(dashboard);
  // 3. Validate empty state - members
  TestValidator.equals("members total should be 0", dashboard.members.total, 0);
  TestValidator.equals(
    "members active should be 0",
    dashboard.members.active,
    0,
  );
  TestValidator.equals(
    "members banned should be 0",
    dashboard.members.banned,
    0,
  );
  // 4. Validate empty state - articles
  TestValidator.equals(
    "articles total should be 0",
    dashboard.articles.total,
    0,
  );
  TestValidator.equals(
    "articles bySection should be empty array",
    dashboard.articles.bySection,
    [],
  );
  // 5. Validate empty state - comments
  TestValidator.equals(
    "comments total should be 0",
    dashboard.comments.total,
    0,
  );
  // 6. Validate empty state - sections
  TestValidator.equals(
    "sections active should be 0",
    dashboard.sections.active,
    0,
  );
  // 7. Validate empty state - activity
  TestValidator.equals(
    "activity last24Hours should be 0",
    dashboard.activity.last24Hours,
    0,
  );
  TestValidator.equals(
    "activity last7Days should be 0",
    dashboard.activity.last7Days,
    0,
  );
  TestValidator.equals(
    "activity last30Days should be 0",
    dashboard.activity.last30Days,
    0,
  );
  // 8. Validate empty state - admin requests
  TestValidator.equals(
    "adminRequests pending should be 0",
    dashboard.adminRequests.pending,
    0,
  );
  // 9. Validate empty state - system settings
  TestValidator.equals(
    "systemSettings active should be 0",
    dashboard.systemSettings.active,
    0,
  );
  // 10. Validate ratio calculations handle division by zero correctly
  TestValidator.equals(
    "articlesPerMember ratio should be 0",
    dashboard.ratios.articlesPerMember,
    0,
  );
  TestValidator.equals(
    "commentsPerArticle ratio should be 0",
    dashboard.ratios.commentsPerArticle,
    0,
  );
}
