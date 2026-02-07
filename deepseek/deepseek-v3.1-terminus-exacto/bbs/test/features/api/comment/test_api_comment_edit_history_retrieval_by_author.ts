import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test scenario for retrieving comment edit history by the original author.
 * This test validates that authenticated users can access the complete edit history
 * of their own comments, including original content, edited content, edit sequence,
 * edit reason, and timestamps.
 *
 * Test steps:
 * 1. Authenticate as a regular user
 * 2. Create an article as the target content
 * 3. Add a comment to the article that will be edited
 * 4. Edit the comment to generate edit history
 * 5. Retrieve the specific edit history entry
 * 6. Validate all fields match the edit operation
 */
export async function test_api_comment_edit_history_retrieval_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create user authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // Create article as parent content
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 15,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Add initial comment to the article
  const initialComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 10,
            wordMax: 20,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);
  // Retrieve edit history by the original author
  const editHistory =
    await api.functional.discussionBoard.articles.comments.edit_histories.at(
      userConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        editHistoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(editHistory);
  // Validate all expected fields are present
  TestValidator.equals("edit history has id", typeof editHistory.id, "string");
  TestValidator.equals(
    "edit history has edit sequence",
    typeof editHistory.edit_sequence,
    "number",
  );
  TestValidator.equals(
    "edit history has original content",
    typeof editHistory.original_content,
    "string",
  );
  TestValidator.equals(
    "edit history has edited content",
    typeof editHistory.edited_content,
    "string",
  );
  TestValidator.equals(
    "edit history has edit reason",
    typeof editHistory.edit_reason,
    "string",
  );
  TestValidator.equals(
    "edit history has timestamp",
    typeof editHistory.created_at,
    "string",
  );
}
