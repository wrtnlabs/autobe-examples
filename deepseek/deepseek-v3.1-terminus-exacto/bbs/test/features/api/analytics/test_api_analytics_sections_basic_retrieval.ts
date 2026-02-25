import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_analytics_sections_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Request section analytics with default pagination (no filters)
  const analytics =
    await api.functional.discussionBoard.superAdmin.analytics.sections.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(analytics);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    analytics.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    analytics.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records non-negative",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    analytics.pagination.pages >= 0,
  );
  // Validate each section statistic
  for (const sectionStat of analytics.data) {
    typia.assert(sectionStat);
    TestValidator.predicate("section stat ID valid", sectionStat.id.length > 0);
    TestValidator.predicate(
      "view count non-negative",
      sectionStat.view_count >= 0,
    );
    TestValidator.predicate(
      "article count non-negative",
      sectionStat.article_count >= 0,
    );
    TestValidator.predicate(
      "comment count non-negative",
      sectionStat.comment_count >= 0,
    );
    TestValidator.predicate(
      "last activity timestamp valid",
      sectionStat.last_activity_at.length > 0,
    );
    // Validate section information
    typia.assert(sectionStat.section);
    TestValidator.predicate(
      "section ID valid",
      sectionStat.section.id.length > 0,
    );
    TestValidator.predicate(
      "section name exists",
      sectionStat.section.name.length > 0,
    );
    TestValidator.predicate(
      "section description exists",
      sectionStat.section.description.length > 0,
    );
    TestValidator.predicate(
      "section status exists",
      sectionStat.section.status.length > 0,
    );
    TestValidator.predicate(
      "display order positive",
      sectionStat.section.display_order > 0,
    );
  }
}
