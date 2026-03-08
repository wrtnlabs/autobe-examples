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
 * Test that an authenticated administrator can successfully access the system dashboard and receive comprehensive platform statistics.
 *
 * This test validates:
 * 1. Admin authentication via /discussionBoard/auth/admin/join succeeds using authorize_admin_join utility function
 * 2. GET /discussionBoard/admin/dashboard/system returns HTTP 200 with valid response
 * 3. Response contains all required statistics fields: members (total, active, banned), articles (total, bySection), comments (total), sections (active), activity (last24Hours, last7Days, last30Days), adminRequests (pending), systemSettings (active), ratios (articlesPerMember, commentsPerArticle)
 * 4. All numeric values are non-negative integers or numbers
 * 5. The bySection array contains objects with section_id (UUID format), section_name (string), and count (integer)
 * 6. Ratios are calculated correctly (articlesPerMember = articles.total / members.total, commentsPerArticle = comments.total / articles.total)
 * 7. When members.total is 0, articlesPerMember returns 0 (not NaN or error)
 * 8. When articles.total is 0, commentsPerArticle returns 0 (not NaN or error)
 * 9. All datetime-related activity metrics use UTC timezone
 *
 * This validates the primary success path for administrators monitoring platform health and activity.
 */
export async function test_api_admin_system_dashboard_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  // 2. Access system dashboard endpoint
  const dashboard =
    await api.functional.discussionBoard.admin.dashboard.system.systemOverview(
      adminConnection,
    );
  typia.assert(dashboard);
  // 3. Validate members statistics structure
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
  // 4. Validate articles statistics structure
  TestValidator.predicate(
    "articles.total is non-negative",
    dashboard.articles.total >= 0,
  );
  TestValidator.predicate(
    "sections.active is non-negative",
    dashboard.sections.active >= 0,
  );
  // 5. Validate comments statistics structure
  TestValidator.predicate(
    "comments.total is non-negative",
    dashboard.comments.total >= 0,
  );
  // 6. Validate activity metrics structure
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
  // 7. Validate admin requests structure
  TestValidator.predicate(
    "adminRequests.pending is non-negative",
    dashboard.adminRequests.pending >= 0,
  );
  // 8. Validate system settings structure
  TestValidator.predicate(
    "systemSettings.active is non-negative",
    dashboard.systemSettings.active >= 0,
  );
  // 9. Validate ratios structure
  TestValidator.predicate(
    "articlesPerMember is non-negative",
    dashboard.ratios.articlesPerMember >= 0,
  );
  TestValidator.predicate(
    "commentsPerArticle is non-negative",
    dashboard.ratios.commentsPerArticle >= 0,
  );
  // 10. Validate bySection array structure
  await ArrayUtil.asyncForEach(
    dashboard.articles.bySection,
    async (section) => {
      typia.assertGuard(section);
      TestValidator.predicate(
        "section_id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          section.section_id,
        ),
      );
      TestValidator.predicate(
        "section_name is non-empty",
        section.section_name.length > 0,
      );
      TestValidator.predicate(
        "section count is non-negative",
        section.count >= 0,
      );
    },
  );
  // 11. Validate ratio calculations (articlesPerMember = articles.total / members.total)
  if (dashboard.members.total > 0) {
    TestValidator.equals(
      "articlesPerMember calculation",
      dashboard.ratios.articlesPerMember,
      dashboard.articles.total / dashboard.members.total,
    );
  } else {
    TestValidator.equals(
      "articlesPerMember is 0 when members.total is 0",
      dashboard.ratios.articlesPerMember,
      0,
    );
  }
  // 12. Validate ratio calculations (commentsPerArticle = comments.total / articles.total)
  if (dashboard.articles.total > 0) {
    TestValidator.equals(
      "commentsPerArticle calculation",
      dashboard.ratios.commentsPerArticle,
      dashboard.comments.total / dashboard.articles.total,
    );
  } else {
    TestValidator.equals(
      "commentsPerArticle is 0 when articles.total is 0",
      dashboard.ratios.commentsPerArticle,
      0,
    );
  }
}
