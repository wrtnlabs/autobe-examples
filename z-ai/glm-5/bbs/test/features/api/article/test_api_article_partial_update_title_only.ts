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
 * Test partial update functionality where only specific fields are modified while others remain unchanged.
 * The test authenticates as a user, creates a section and article with initial title and content,
 * then performs an update that only modifies the title field (omitting content and sectionId).
 * Validates that: (1) the title is updated to the new value, (2) the original content remains
 * exactly as created, (3) the section assignment is preserved, (4) the updated_at timestamp changes.
 */
export async function test_api_article_partial_update_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create a section for article assignment
  const section = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {},
  );
  typia.assert(section);
  // 3. Create an article with initial title and content
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalContent = RandomGenerator.content({ paragraphs: 2 });
  const article = await generate_random_discussion_board_user_articles_create(
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
  // Store original values for comparison
  const originalArticleId = article.id;
  const originalSectionId = article.section.id;
  const originalCreatedAt = article.created_at;
  const originalUpdatedAt = article.updated_at;
  // 4. Perform partial update - only modify title
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedArticle =
    await api.functional.discussionBoard.user.articles.update(userConnection, {
      articleId: originalArticleId,
      body: {
        title: newTitle,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);
  // 5. Validate partial update semantics
  // Title should be updated
  TestValidator.equals("title updated", updatedArticle.title, newTitle);
  // Content should remain unchanged
  TestValidator.equals(
    "content preserved",
    updatedArticle.content,
    originalContent,
  );
  // Section assignment should be preserved
  TestValidator.equals(
    "section preserved",
    updatedArticle.section.id,
    originalSectionId,
  );
  // ID should remain the same
  TestValidator.equals("id unchanged", updatedArticle.id, originalArticleId);
  // Created_at should remain the same
  TestValidator.equals(
    "created_at unchanged",
    updatedArticle.created_at,
    originalCreatedAt,
  );
  // Updated_at should be different (changed by server)
  TestValidator.notEquals(
    "updated_at changed",
    updatedArticle.updated_at,
    originalUpdatedAt,
  );
}
