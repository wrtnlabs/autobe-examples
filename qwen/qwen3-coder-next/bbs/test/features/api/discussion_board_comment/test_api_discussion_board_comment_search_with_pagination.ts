import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_comment_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // 2. Create a section for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create an article ID for testing
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test basic pagination with default parameters
  const defaultResult =
    await api.functional.discussionBoard.superAdmin.articles.comments.index(
      adminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleComment.IRequest>(),
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "pagination exists",
    defaultResult.pagination !== null,
    true,
  );
  // 5. Test pagination with limit parameter
  const limitedResult =
    await api.functional.discussionBoard.superAdmin.articles.comments.index(
      adminConnection,
      {
        articleId: articleId,
        body: {
          ...typia.random<IDiscussionBoardArticleComment.IRequest>(),
          limit: 2,
        },
      },
    );
  typia.assert(limitedResult);
  TestValidator.predicate("limited results", limitedResult.data.length <= 2);
  // 6. Test sorting in ascending order
  const ascendingResult =
    await api.functional.discussionBoard.superAdmin.articles.comments.index(
      adminConnection,
      {
        articleId: articleId,
        body: {
          ...typia.random<IDiscussionBoardArticleComment.IRequest>(),
          sort: "created_at",
        },
      },
    );
  typia.assert(ascendingResult);
  // 7. Test sorting in descending order
  const descendingResult =
    await api.functional.discussionBoard.superAdmin.articles.comments.index(
      adminConnection,
      {
        articleId: articleId,
        body: {
          ...typia.random<IDiscussionBoardArticleComment.IRequest>(),
          sort: "-created_at",
        },
      },
    );
  typia.assert(descendingResult);
  // 8. Test search functionality
  const searchTerm = RandomGenerator.alphabets(5);
  const searchResult =
    await api.functional.discussionBoard.superAdmin.articles.comments.index(
      adminConnection,
      {
        articleId: articleId,
        body: {
          ...typia.random<IDiscussionBoardArticleComment.IRequest>(),
          search: { keyword: searchTerm },
        },
      },
    );
  typia.assert(searchResult);
  // 9. Test filtering by author
  const authorId = typia.random<string & tags.Format<"uuid">>();
  const authorResult =
    await api.functional.discussionBoard.superAdmin.articles.comments.index(
      adminConnection,
      {
        articleId: articleId,
        body: {
          ...typia.random<IDiscussionBoardArticleComment.IRequest>(),
          filter: { author_id: authorId },
        },
      },
    );
  typia.assert(authorResult);
  // 10. Test combined pagination and search
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.articles.comments.index(
      adminConnection,
      {
        articleId: articleId,
        body: {
          ...typia.random<IDiscussionBoardArticleComment.IRequest>(),
          limit: 3,
          page: 1,
          search: { keyword: searchTerm },
          sort: "-created_at",
        },
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "pagination matches",
    combinedResult.pagination.limit,
    3,
  );
}
