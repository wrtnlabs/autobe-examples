import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test content boundary validation when updating comment.
 *
 * This test validates that comment updates correctly handle boundary conditions
 * for the content field, which must be 1-10,000 characters after whitespace trimming.
 *
 * Test Cases:
 * 1. Single character content update succeeds (minimum boundary)
 * 2. Maximum length content (10,000 characters) update succeeds
 * 3. Whitespace-surrounded content is properly trimmed
 * 4. Each update sets a new updated_at timestamp
 */
export async function test_api_comment_update_content_boundary_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article for the comment
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Create initial comment with standard content
  const initialContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: { content: initialContent },
      },
    );
  typia.assert(comment);
  // Test 1: Update with single character content (minimum boundary - exactly 1 char)
  const singleCharContent = "x";
  const updatedSingleChar =
    await api.functional.discussionBoard.user.articles.comments.update(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: singleCharContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedSingleChar);
  TestValidator.equals(
    "single character content should be stored correctly",
    updatedSingleChar.content,
    singleCharContent,
  );
  TestValidator.predicate(
    "updated_at should be set after single char update",
    updatedSingleChar.updated_at !== null,
  );
  // Store timestamp for comparison
  const firstUpdateTimestamp = updatedSingleChar.updated_at;
  // Test 2: Update with maximum length content (exactly 10,000 characters)
  const maxContent = "a".repeat(10000);
  const updatedMax =
    await api.functional.discussionBoard.user.articles.comments.update(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: { content: maxContent } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedMax);
  TestValidator.equals(
    "maximum length content should be stored correctly",
    updatedMax.content,
    maxContent,
  );
  TestValidator.predicate(
    "updated_at should be set after max length update",
    updatedMax.updated_at !== null,
  );
  TestValidator.predicate(
    "updated_at should change with each update",
    updatedMax.updated_at !== firstUpdateTimestamp,
  );
  // Test 3: Update with whitespace-surrounded content (verifies trimming)
  const trimmedContent = "y";
  const whitespaceContent = "   " + trimmedContent + "   ";
  const updatedTrimmed =
    await api.functional.discussionBoard.user.articles.comments.update(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: whitespaceContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedTrimmed);
  TestValidator.equals(
    "whitespace-surrounded content should be trimmed",
    updatedTrimmed.content,
    trimmedContent,
  );
  TestValidator.predicate(
    "updated_at should be set after trimmed content update",
    updatedTrimmed.updated_at !== null,
  );
}
