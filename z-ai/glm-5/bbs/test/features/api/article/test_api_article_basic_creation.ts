import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful creation of a basic article with required fields only.
 *
 * This test validates that:
 * 1. A user can create an article with minimal required fields
 * 2. The article is properly associated with the authenticated user
 * 3. The article is properly associated with the specified section
 * 4. Optional fields default to empty arrays/null appropriately
 */
export async function test_api_article_basic_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // 2. Create a section for the article
  const section = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {},
  );
  typia.assert(section);
  // 3. Prepare article creation data
  const title = RandomGenerator.paragraph({ sentences: 1 }) satisfies string;
  const content = RandomGenerator.content({ paragraphs: 2 }) satisfies string;
  const articleInput = {
    title,
    content,
    sectionId: section.id,
  } satisfies IDiscussionBoardArticle.ICreate;
  // 4. Create the article
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    { body: articleInput },
  );
  typia.assert(article);
  // 5. Validate the response
  // typia.assert validates all type properties including UUID format, timestamps, etc.
  // Business logic validations:
  TestValidator.equals(
    "author id matches",
    article.author.id,
    authorizedUser.id,
  );
  TestValidator.equals("section id matches", article.section.id, section.id);
  TestValidator.equals("title matches", article.title, title);
  TestValidator.equals("content matches", article.content, content);
  TestValidator.equals("deleted_at is null", article.deleted_at, null);
  TestValidator.equals("files array is empty", article.files.length, 0);
  TestValidator.equals("images array is empty", article.images.length, 0);
  TestValidator.equals("tags array is empty", article.tags.length, 0);
  TestValidator.equals("comments_count is zero", article.comments_count, 0);
}
