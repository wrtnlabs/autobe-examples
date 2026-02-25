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
 * Test the primary success path for article update where the article author
 * updates their own article with new title and content.
 *
 * Workflow:
 * 1. Authenticate as a user via join
 * 2. Create a section for article organization
 * 3. Create an article with initial title and content
 * 4. Update the article with modified title and content
 * 5. Validate the update was successful
 *
 * Validations:
 * - The response returns the updated article
 * - The updated article contains the new title and content
 * - The updated_at timestamp is later than created_at
 * - The author remains unchanged
 * - The section remains unchanged
 * - The created_at timestamp remains unchanged
 */
export async function test_api_article_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication - create a new user account
  const userConnection: api.IConnection = { host: connection.host };
  const user: IDiscussionBoardUser.IAuthorized = await authorize_user_join(
    userConnection,
    {},
  );
  typia.assert(user);
  // 2. Create a section for the article
  const section: IDiscussionBoardSection =
    await generate_random_discussion_board_user_sections_create(
      userConnection,
      {},
    );
  typia.assert(section);
  // 3. Create an article with initial title and content
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: originalTitle,
          content: originalContent,
          sectionId: section.id,
        },
      },
    );
  typia.assert(article);
  // Store original values for validation
  const originalCreatedAt = article.created_at;
  const originalAuthorId = article.author.id;
  const originalSectionId = article.section.id;
  // 4. Update the article with new title and content
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.update(userConnection, {
      articleId: article.id,
      body: {
        title: newTitle,
        content: newContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);
  // 5. Validate the updated article
  TestValidator.equals(
    "title matches new title",
    updatedArticle.title,
    newTitle,
  );
  TestValidator.equals(
    "content matches new content",
    updatedArticle.content,
    newContent,
  );
  TestValidator.equals(
    "author unchanged",
    updatedArticle.author.id,
    originalAuthorId,
  );
  TestValidator.equals(
    "section unchanged",
    updatedArticle.section.id,
    originalSectionId,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedArticle.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is later than created_at",
    updatedArticle.updated_at > originalCreatedAt,
  );
}
