import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleReaction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_reactions_analytics_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Test filtering by reaction type with random valid type
  const reactionTypeFilter =
    await api.functional.discussionBoard.superAdmin.reactions.analytics.index(
      superAdminConnection,
      {
        body: {
          reaction_type: typia.random<string>(),
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
    await api.functional.discussionBoard.superAdmin.reactions.analytics.index(
      superAdminConnection,
      {
        body: {
          created_at_start: oneWeekAgo,
          created_at_end: now,
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  // 4. Test pagination with valid page and limit
  const paginationTest =
    await api.functional.discussionBoard.superAdmin.reactions.analytics.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(paginationTest);
  // 5. Test combined filters
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.reactions.analytics.index(
      superAdminConnection,
      {
        body: {
          reaction_type: typia.random<string>(),
          created_at_start: oneWeekAgo,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 6. Validate pagination metadata using TestValidator
  TestValidator.predicate(
    "pagination metadata exists",
    paginationTest.pagination !== undefined,
  );
  TestValidator.equals(
    "current page matches request",
    paginationTest.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginationTest.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    paginationTest.pagination.pages >= 0,
  );
}
