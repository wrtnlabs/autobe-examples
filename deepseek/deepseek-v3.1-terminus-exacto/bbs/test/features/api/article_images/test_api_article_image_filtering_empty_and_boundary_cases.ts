import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test boundary conditions and edge cases for the article image filtering endpoint.
 * Covers scenarios including empty images, invalid parameters, extreme pagination,
 * and ownership validation.
 */
export async function test_api_article_image_filtering_empty_and_boundary_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create user connections with proper isolation
  const userConnection: api.IConnection = { host: connection.host };
  // Use utility function for user registration
  const user = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(user);
  // Create an article with valid data (simulate having a valid section ID)
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test 1: Article with no images - should return empty data array
  const emptyResult =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty data array", emptyResult.data, []);
  TestValidator.equals("records zero", emptyResult.pagination.records, 0);
  TestValidator.equals("pages zero", emptyResult.pagination.pages, 0);
  // Test 2: Article with images but no filter parameters
  const defaultResult =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals("default page", defaultResult.pagination.current, 1);
  TestValidator.equals("default limit", defaultResult.pagination.limit, 100);
  // Test 3: Filter with non-existent article ID (business error, not type error)
  await TestValidator.error("non-existent article ID", async () => {
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  });
  // Test 4: Filter with combination of parameters where no images match
  const noMatchResult =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          status: "invalid_status_value",
          display_order: 9999,
          alt_text: "nonexistent_alt_text",
          caption: "nonexistent_caption",
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals("no match data array", noMatchResult.data, []);
  // Test 5: Extreme pagination values
  const extremePaginationResult =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 9999,
          limit: 1,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(extremePaginationResult);
  TestValidator.equals(
    "extreme page data empty",
    extremePaginationResult.data,
    [],
  );
  TestValidator.predicate(
    "extreme page has valid current",
    extremePaginationResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "extreme page limit",
    extremePaginationResult.pagination.limit,
    1,
  );
  // Test 6: Invalid display_order value (business logic test)
  const invalidDisplayOrderResult =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          display_order: 999999,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(invalidDisplayOrderResult);
  TestValidator.equals(
    "invalid display_order data empty",
    invalidDisplayOrderResult.data,
    [],
  );
  // Test 7: Invalid status value (business logic test)
  const invalidStatusResult =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          status: "invalid_status_value",
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(invalidStatusResult);
  TestValidator.equals(
    "invalid status data empty",
    invalidStatusResult.data,
    [],
  );
  // Test 8: Ownership validation - create another user and try to access the article
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUser = await api.functional.discussionBoard.auth.user.join(
    otherUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(otherUser);
  await TestValidator.error("access another user's article", async () => {
    await api.functional.discussionBoard.user.articles.images.index(
      otherUserConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  });
}
