import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
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

export async function test_api_article_images_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register using available SDK function
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(authorizedUser);
  // Create an article with no images attached using available SDK function
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test 1: Filter by status that doesn't exist (no images attached)
  const response1 = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        status: "active" as const,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(response1);
  TestValidator.equals(
    "empty data array for status filter",
    response1.data,
    [],
  );
  TestValidator.equals(
    "zero records for status filter",
    response1.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for status filter",
    response1.pagination.pages,
    0,
  );
  // Test 2: Filter by display order range that excludes all images
  const response2 = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        display_order_min: 10,
        display_order_max: 20,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(response2);
  TestValidator.equals(
    "empty data array for display order range",
    response2.data,
    [],
  );
  TestValidator.equals(
    "zero records for display order range",
    response2.pagination.records,
    0,
  );
  // Test 3: Filter by alt text that doesn't match any images
  const response3 = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        alt_text: "non-existent-alt-text",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(response3);
  TestValidator.equals(
    "empty data array for alt text filter",
    response3.data,
    [],
  );
  TestValidator.equals(
    "zero records for alt text filter",
    response3.pagination.records,
    0,
  );
  // Test 4: Filter by caption that doesn't match any images
  const response4 = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        caption: "non-existent-caption",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(response4);
  TestValidator.equals(
    "empty data array for caption filter",
    response4.data,
    [],
  );
  TestValidator.equals(
    "zero records for caption filter",
    response4.pagination.records,
    0,
  );
  // Test 5: Combined filter with impossible conditions
  const response5 = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        status: "archived" as const,
        display_order_min: 100,
        alt_text: "impossible-combination",
        caption: "non-matching-caption",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(response5);
  TestValidator.equals(
    "empty data array for combined filter",
    response5.data,
    [],
  );
  TestValidator.equals(
    "zero records for combined filter",
    response5.pagination.records,
    0,
  );
}
