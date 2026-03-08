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
 * Test that the system dashboard endpoint returns valid statistics with correct type structure.
 * The test should verify:
 *
 * 1. Admin authentication succeeds via authorize_admin_join
 * 2. GET /discussionBoard/admin/dashboard/system returns HTTP 200
 * 3. Verify response structure matches IDiscussionBoardSystemDashboard type
 * 4. Verify all required fields exist: members, articles, comments, sections, activity, adminRequests, systemSettings, ratios
 * 5. Verify members object has total, active, and banned counts (all non-negative integers)
 * 6. Verify articles object has total count and bySection array
 * 7. Verify bySection array contains objects with section_id (UUID), section_name (string), and count (non-negative integer)
 * 8. Verify comments object has total count (non-negative integer)
 * 9. Verify sections object has active count (non-negative integer)
 * 10. Verify activity object has last24Hours, last7Days, and last30Days counts (all non-negative integers)
 * 11. Verify adminRequests object has pending count (non-negative integer)
 * 12. Verify systemSettings object has active count (non-negative integer)
 * 13. Verify ratios object has articlesPerMember and commentsPerArticle (both numbers, can be 0 if denominator is 0)
 * 14. Verify all numeric counts are >= 0
 * 15. Verify ratios are calculated correctly when counts are non-zero
 *
 * This validates the dashboard endpoint returns properly structured statistics with correct types and reasonable values.
 */
export async function test_api_admin_system_dashboard_statistics_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
    },
  });
  typia.assert(admin);
  // 2. Call dashboard endpoint
  const dashboard: IDiscussionBoardSystemDashboard =
    await api.functional.discussionBoard.admin.dashboard.system.systemOverview(
      adminConnection,
    );
  typia.assert(dashboard);
  // 3-4. Verify response structure - all required fields exist (typia.assert already validates this)
  // 5. Verify members object
  TestValidator.predicate(
    "members.total is non-negative",
    dashboard.members.total >= 0,
  );
  TestValidator.predicate(
    "members.active is non-negative",
    dashboard.members.active >= 0,
  );
  TestValidator.predicate(
    "members.banned is non-negative",
    dashboard.members.banned >= 0,
  );
  TestValidator.predicate(
    "members.active + banned equals total",
    dashboard.members.active + dashboard.members.banned ===
      dashboard.members.total,
  );
  // 6. Verify articles object
  TestValidator.predicate(
    "articles.total is non-negative",
    dashboard.articles.total >= 0,
  );
  TestValidator.predicate(
    "articles.bySection is array",
    Array.isArray(dashboard.articles.bySection),
  );
  // 7. Verify bySection array
  if (dashboard.articles.bySection.length > 0) {
    const firstSection = dashboard.articles.bySection[0];
    TestValidator.predicate(
      "section_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSection.section_id,
      ),
    );
    TestValidator.predicate(
      "section_name is non-empty string",
      firstSection.section_name.length > 0,
    );
    TestValidator.predicate(
      "section count is non-negative",
      firstSection.count >= 0,
    );
    // Verify all sections have valid structure
    await ArrayUtil.asyncForEach(
      dashboard.articles.bySection,
      async (section) => {
        TestValidator.predicate(
          "section_id is valid UUID",
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            section.section_id,
          ),
        );
        TestValidator.predicate(
          "section_name is non-empty string",
          section.section_name.length > 0,
        );
        TestValidator.predicate(
          "section count is non-negative",
          section.count >= 0,
        );
      },
    );
    // Verify sum of bySection counts equals total
    const bySectionSum = dashboard.articles.bySection.reduce(
      (sum, s) => sum + s.count,
      0,
    );
    TestValidator.equals(
      "bySection sum equals total",
      bySectionSum,
      dashboard.articles.total,
    );
  }
  // 8. Verify comments object
  TestValidator.predicate(
    "comments.total is non-negative",
    dashboard.comments.total >= 0,
  );
  // 9. Verify sections object
  TestValidator.predicate(
    "sections.active is non-negative",
    dashboard.sections.active >= 0,
  );
  // 10. Verify activity object
  TestValidator.predicate(
    "activity.last24Hours is non-negative",
    dashboard.activity.last24Hours >= 0,
  );
  TestValidator.predicate(
    "activity.last7Days is non-negative",
    dashboard.activity.last7Days >= 0,
  );
  TestValidator.predicate(
    "activity.last30Days is non-negative",
    dashboard.activity.last30Days >= 0,
  );
  TestValidator.predicate(
    "activity.last24Hours <= last7Days",
    dashboard.activity.last24Hours <= dashboard.activity.last7Days,
  );
  TestValidator.predicate(
    "activity.last7Days <= last30Days",
    dashboard.activity.last7Days <= dashboard.activity.last30Days,
  );
  // 11. Verify adminRequests object
  TestValidator.predicate(
    "adminRequests.pending is non-negative",
    dashboard.adminRequests.pending >= 0,
  );
  // 12. Verify systemSettings object
  TestValidator.predicate(
    "systemSettings.active is non-negative",
    dashboard.systemSettings.active >= 0,
  );
  // 13-15. Verify ratios
  TestValidator.predicate(
    "ratios.articlesPerMember is non-negative",
    dashboard.ratios.articlesPerMember >= 0,
  );
  TestValidator.predicate(
    "ratios.commentsPerArticle is non-negative",
    dashboard.ratios.commentsPerArticle >= 0,
  );
  // Verify ratio calculations when denominators are non-zero
  if (dashboard.members.total > 0) {
    const expectedArticlesPerMember =
      dashboard.articles.total / dashboard.members.total;
    TestValidator.equals(
      "articlesPerMember calculation",
      dashboard.ratios.articlesPerMember,
      expectedArticlesPerMember,
    );
  } else {
    TestValidator.equals(
      "articlesPerMember is 0 when no members",
      dashboard.ratios.articlesPerMember,
      0,
    );
  }
  if (dashboard.articles.total > 0) {
    const expectedCommentsPerArticle =
      dashboard.comments.total / dashboard.articles.total;
    TestValidator.equals(
      "commentsPerArticle calculation",
      dashboard.ratios.commentsPerArticle,
      expectedCommentsPerArticle,
    );
  } else {
    TestValidator.equals(
      "commentsPerArticle is 0 when no articles",
      dashboard.ratios.commentsPerArticle,
      0,
    );
  }
}
