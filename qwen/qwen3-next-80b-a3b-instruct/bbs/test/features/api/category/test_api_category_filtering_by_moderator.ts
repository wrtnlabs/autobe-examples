import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_category_filtering_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate as moderator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Test basic pagination with default parameters
  const defaultResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default page should be 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultResult.pagination.limit,
    20,
  );
  // Step 3: Test name partial matching
  const nameMatchResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          name: "Tech",
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(nameMatchResult);
  // Step 4: Test description keyword searching
  const descriptionResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          description: "technology",
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(descriptionResult);
  // Step 5: Test status filtering - active categories
  const activeResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          status: "active",
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(activeResult);
  // Step 6: Test status filtering - inactive categories
  const inactiveResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          status: "inactive",
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(inactiveResult);
  // Step 7: Test parent category hierarchical filtering
  const parentResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          parent_category_id: null,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(parentResult);
  // Step 8: Test time-based filtering - created_at_from
  const createdAtFromResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          created_at_from: new Date().toISOString(),
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(createdAtFromResult);
  // Step 9: Test time-based filtering - created_at_to
  const createdAtToResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          created_at_to: new Date().toISOString(),
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(createdAtToResult);
  // Step 10: Test sorting by different fields
  const sortByNameResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          sort_by: "name",
          order: "asc",
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(sortByNameResult);
  const sortByArticleCountResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          sort_by: "article_count",
          order: "desc",
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(sortByArticleCountResult);
  const sortByCreatedAtResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(sortByCreatedAtResult);
  // Step 11: Test pagination limits
  const limitResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(limitResult);
  TestValidator.equals(
    "custom limit should be 5",
    limitResult.pagination.limit,
    5,
  );
  // Step 12: Test complex combination of parameters
  const complexResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          name: "Tech",
          description: "programming",
          status: "active",
          sort_by: "name",
          order: "asc",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(complexResult);
  // Step 13: Test empty response scenarios
  const emptyResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      adminConnection,
      {
        body: {
          name: "this_category_should_not_exist", // Unique name that won't match any category
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "empty result should have no data",
    () => emptyResult.data.length === 0,
  );
}
