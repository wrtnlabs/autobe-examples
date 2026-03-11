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

export async function test_api_reactions_analytics_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test filtering by reaction type
  const reactionTypeFilter =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          reaction_type: "like",
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(reactionTypeFilter);
  // 3. Test filtering by date range
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();
  const dateRangeFilter =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          created_at_start: oneWeekAgo,
          created_at_end: now,
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  // 4. Test pagination
  const paginationTest =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(paginationTest);
  // 5. Test combined filters
  const oneMonthAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const combinedFilter =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          reaction_type: "helpful",
          created_at_start: oneMonthAgo,
          created_at_end: now,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 6. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is non-negative",
    paginationTest.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    paginationTest.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginationTest.pagination.pages >= 0,
  );
  // 7. Validate that data array length respects the limit
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    paginationTest.data.length <= paginationTest.pagination.limit,
  );
}
