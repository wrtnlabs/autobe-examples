import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentEditHistory";
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

export async function test_api_comment_edit_history_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup user connection
  const userConnection: api.IConnection = { host: connection.host };
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
  // Create an article
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
  // Create initial comment
  const initialCommentContent = RandomGenerator.paragraph({ sentences: 1 });
  const initialComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: initialCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);
  // Perform first edit
  const firstEditContent = RandomGenerator.paragraph({ sentences: 1 });
  const firstEditReason = "Fixed typo in content";
  const editedComment1 =
    await api.functional.discussionBoard.user.articles.comments.update(
      userConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: firstEditContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(editedComment1);
  // Perform second edit
  const secondEditContent = RandomGenerator.paragraph({ sentences: 1 });
  const secondEditReason = "Added more details";
  const editedComment2 =
    await api.functional.discussionBoard.user.articles.comments.update(
      userConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: secondEditContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(editedComment2);
  // Retrieve edit history with pagination
  const editHistory =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: initialComment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(editHistory);
  // Validate pagination information
  TestValidator.equals(
    "pagination records count",
    editHistory.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages count",
    editHistory.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    editHistory.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", editHistory.pagination.limit, 10);
  // Validate data array
  TestValidator.equals("edit history count", editHistory.data.length, 2);
  // Validate edit sequence order (should be ascending)
  TestValidator.equals("edit sequence 1", editHistory.data[0].edit_sequence, 1);
  TestValidator.equals("edit sequence 2", editHistory.data[1].edit_sequence, 2);
  // Validate first edit history record
  const firstHistory = editHistory.data[0];
  TestValidator.equals(
    "first edit original content",
    firstHistory.original_content,
    initialCommentContent,
  );
  TestValidator.equals(
    "first edit edited content",
    firstHistory.edited_content,
    firstEditContent,
  );
  TestValidator.equals(
    "first edit parent comment ID",
    firstHistory.discussion_board_comment_id,
    initialComment.id,
  );
  TestValidator.predicate(
    "first edit timestamp exists",
    firstHistory.created_at !== null,
  );
  // Validate second edit history record
  const secondHistory = editHistory.data[1];
  TestValidator.equals(
    "second edit original content",
    secondHistory.original_content,
    firstEditContent,
  );
  TestValidator.equals(
    "second edit edited content",
    secondHistory.edited_content,
    secondEditContent,
  );
  TestValidator.equals(
    "second edit parent comment ID",
    secondHistory.discussion_board_comment_id,
    initialComment.id,
  );
  TestValidator.predicate(
    "second edit timestamp exists",
    secondHistory.created_at !== null,
  );
  // Validate parent comment information in each record
  for (const historyRecord of editHistory.data) {
    TestValidator.equals(
      "comment ID matches",
      historyRecord.comment.id,
      initialComment.id,
    );
    TestValidator.predicate(
      "comment content exists",
      historyRecord.comment.content.length > 0,
    );
    TestValidator.predicate(
      "comment author exists",
      historyRecord.comment.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "comment timestamp exists",
      historyRecord.comment.created_at !== null,
    );
  }
}
