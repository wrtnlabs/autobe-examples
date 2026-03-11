import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleReaction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test reaction analytics for trend analysis and engagement pattern identification.
 * This scenario validates that administrators can analyze reaction trends over time
 * by filtering data across different time periods. Test includes comparing reaction
 * patterns across multiple date ranges to identify engagement trends, verify that
 * the system provides accurate time-based aggregation, and validate that reaction
 * distribution by type is correctly calculated.
 */
export async function test_api_reactions_analytics_trend_analysis(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test analytics with different time ranges
  const now = new Date();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneMonthAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Test analytics for past week
  const weekAnalytics =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          created_at_start: oneWeekAgo,
          created_at_end: now.toISOString(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(weekAnalytics);
  // Test analytics for past month
  const monthAnalytics =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          created_at_start: oneMonthAgo,
          created_at_end: now.toISOString(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(monthAnalytics);
  // 3. Test filtering by reaction type
  const reactionTypes = ["like", "helpful", "insightful"] as const;
  const randomType = RandomGenerator.pick(reactionTypes);
  const typeAnalytics =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          reaction_type: randomType,
          created_at_start: oneMonthAgo,
          created_at_end: now.toISOString(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(typeAnalytics);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    weekAnalytics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    weekAnalytics.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    weekAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    weekAnalytics.pagination.pages >= 0,
  );
  // 5. Validate analytics data structure
  if (weekAnalytics.data.length > 0) {
    const reaction = weekAnalytics.data[0];
    TestValidator.predicate("reaction has valid ID", reaction.id.length > 0);
    TestValidator.predicate(
      "reaction has type",
      reaction.reaction_type.length > 0,
    );
    TestValidator.predicate(
      "reaction has creation timestamp",
      reaction.created_at.length > 0,
    );
    TestValidator.predicate(
      "reaction has article reference",
      reaction.article.id.length > 0,
    );
    TestValidator.predicate(
      "reaction has member reference",
      reaction.member.id.length > 0,
    );
  }
  // 6. Test business logic: month analytics should have equal or more records than week analytics
  TestValidator.predicate(
    "month analytics should have equal or more records than week analytics",
    monthAnalytics.pagination.records >= weekAnalytics.pagination.records,
  );
}
