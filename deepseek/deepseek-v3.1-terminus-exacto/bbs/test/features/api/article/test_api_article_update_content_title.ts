import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test updating an article's content and title while keeping the same section.
 * Authenticate as a user, create an article, then update the article with new
 * title and content. Validate that the article is successfully updated with
 * the new content, title remains unchanged if not provided, timestamps are
 * updated, and the response includes complete article information with author
 * and section details. Verify that only the authenticated user who owns the
 * article can update it.
 */
export async function test_api_article_update_content_title(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create initial article with proper content and title lengths
  const initialArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          section_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(initialArticle);
  // Update article with new title and content
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
  } satisfies IDiscussionBoardArticle.IUpdate;
  const updatedArticle =
    await api.functional.discussionBoard.user.articles.update(userConnection, {
      articleId: initialArticle.id,
      body: updateBody,
    });
  typia.assert(updatedArticle);
  // Validate that the article was updated correctly
  TestValidator.equals(
    "article ID remains the same",
    updatedArticle.id,
    initialArticle.id,
  );
  TestValidator.equals(
    "title is updated",
    updatedArticle.title,
    updateBody.title,
  );
  TestValidator.equals(
    "content is updated",
    updatedArticle.content,
    updateBody.content,
  );
  TestValidator.equals(
    "section remains the same",
    updatedArticle.section.id,
    initialArticle.section.id,
  );
  TestValidator.equals(
    "author remains the same",
    updatedArticle.author.id,
    initialArticle.author.id,
  );
  TestValidator.predicate(
    "updated_at timestamp is newer",
    new Date(updatedArticle.updated_at) > new Date(initialArticle.updated_at),
  );
  TestValidator.predicate(
    "status remains published",
    updatedArticle.status === "published",
  );
}