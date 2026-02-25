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
 * Test successful comment update by the comment author.
 *
 * This test validates the complete comment update workflow:
 * 1. User authenticates via registration
 * 2. User creates an article in a section
 * 3. User creates a comment on that article
 * 4. User updates the comment with new content
 * 5. Verifies all response properties and business logic
 */
export async function test_api_comment_update_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Step 2: Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // Step 3: Create a comment on the article
  const originalContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: { content: originalContent },
      },
    );
  typia.assert(comment);
  // Store original values for validation
  const originalCommentId = comment.id;
  const originalCreatedAt = comment.created_at;
  const originalAuthorId = comment.author.id;
  // Step 4: Update the comment
  const newContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedComment =
    await api.functional.discussionBoard.user.articles.comments.update(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: `  ${newContent}  `,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Step 5: Validate response
  // (1) Comment ID remains unchanged
  TestValidator.equals(
    "comment id unchanged",
    updatedComment.id,
    originalCommentId,
  );
  // (2) Content reflects new value with whitespace trimmed
  TestValidator.equals("content trimmed", updatedComment.content, newContent);
  // (3) updated_at timestamp is set (not null)
  TestValidator.predicate(
    "updated_at is set",
    updatedComment.updated_at !== null,
  );
  // (4) created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    originalCreatedAt,
  );
  // (5) Author relation is correctly populated
  TestValidator.equals(
    "author id unchanged",
    updatedComment.author.id,
    originalAuthorId,
  );
  TestValidator.equals("author is the user", updatedComment.author.id, user.id);
  // (6) Comment is not deleted
  TestValidator.equals("not soft deleted", updatedComment.deleted_at, null);
}
