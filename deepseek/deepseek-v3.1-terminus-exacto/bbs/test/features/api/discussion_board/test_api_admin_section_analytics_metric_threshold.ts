import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_section_analytics_metric_threshold(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: High traffic sections (min_view_count=100)
  const highTrafficResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          min_view_count: 100,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(highTrafficResponse);
  // Validate all sections meet the minimum view count
  for (const statistic of highTrafficResponse.data) {
    TestValidator.predicate(
      "section meets min_view_count threshold",
      statistic.view_count >= 100,
    );
  }
  // Test 2: Low activity sections (max_comment_count=5)
  const lowActivityResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          max_comment_count: 5,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(lowActivityResponse);
  // Validate all sections meet the maximum comment count
  for (const statistic of lowActivityResponse.data) {
    TestValidator.predicate(
      "section meets max_comment_count threshold",
      statistic.comment_count <= 5,
    );
  }
  // Test 3: Balanced sections (min_article_count=10 AND max_comment_count=50)
  const balancedResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          min_article_count: 10,
          max_comment_count: 50,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(balancedResponse);
  // Validate all sections meet both criteria simultaneously
  for (const statistic of balancedResponse.data) {
    TestValidator.predicate(
      "section meets min_article_count threshold",
      statistic.article_count >= 10,
    );
    TestValidator.predicate(
      "section meets max_comment_count threshold",
      statistic.comment_count <= 50,
    );
  }
  // Test 4: Boundary conditions - minimum thresholds
  const minThresholdsResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          min_view_count: 0,
          min_article_count: 0,
          min_comment_count: 0,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(minThresholdsResponse);
  // Validate all sections meet the minimum thresholds
  for (const statistic of minThresholdsResponse.data) {
    TestValidator.predicate(
      "section meets min_view_count boundary",
      statistic.view_count >= 0,
    );
    TestValidator.predicate(
      "section meets min_article_count boundary",
      statistic.article_count >= 0,
    );
    TestValidator.predicate(
      "section meets min_comment_count boundary",
      statistic.comment_count >= 0,
    );
  }
  // Test 5: Boundary conditions - maximum thresholds
  const maxThresholdsResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          max_view_count: 1000,
          max_article_count: 100,
          max_comment_count: 200,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(maxThresholdsResponse);
  // Validate all sections meet the maximum thresholds
  for (const statistic of maxThresholdsResponse.data) {
    TestValidator.predicate(
      "section meets max_view_count threshold",
      statistic.view_count <= 1000,
    );
    TestValidator.predicate(
      "section meets max_article_count threshold",
      statistic.article_count <= 100,
    );
    TestValidator.predicate(
      "section meets max_comment_count threshold",
      statistic.comment_count <= 200,
    );
  }
  // Test 6: Range combination with all metrics
  const rangeCombinationResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          min_view_count: 10,
          max_view_count: 500,
          min_article_count: 5,
          max_article_count: 50,
          min_comment_count: 2,
          max_comment_count: 100,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(rangeCombinationResponse);
  // Validate all sections meet all range criteria simultaneously
  for (const statistic of rangeCombinationResponse.data) {
    TestValidator.predicate(
      "section meets view count range",
      statistic.view_count >= 10 && statistic.view_count <= 500,
    );
    TestValidator.predicate(
      "section meets article count range",
      statistic.article_count >= 5 && statistic.article_count <= 50,
    );
    TestValidator.predicate(
      "section meets comment count range",
      statistic.comment_count >= 2 && statistic.comment_count <= 100,
    );
  }
}
