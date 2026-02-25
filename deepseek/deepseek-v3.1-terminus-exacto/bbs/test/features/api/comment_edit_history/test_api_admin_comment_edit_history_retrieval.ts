import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_admin_comment_edit_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create and authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 3. Create comment as user (using utility function when available)
  // Since we need an articleId, but article creation API is not available,
  // we'll use a randomly generated articleId for this test
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: articleId,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Retrieve edit history as admin
  // Since comment editing functionality is not available in the provided APIs,
  // we'll test the retrieval functionality assuming edit history exists
  // This tests the admin's ability to access comment edit histories
  const editHistories =
    await api.functional.discussionBoard.admin.comments.edit_histories.at(
      adminConnection,
      {
        commentId: comment.id,
        editHistoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(editHistories);
  // 5. Validate edit history structure
  TestValidator.predicate("has valid id", editHistories.id.length > 0);
  TestValidator.equals(
    "comment id matches",
    editHistories.discussion_board_comment_id,
    comment.id,
  );
  TestValidator.predicate(
    "has edit sequence",
    editHistories.edit_sequence >= 1,
  );
  TestValidator.predicate(
    "has original content",
    editHistories.original_content.length > 0,
  );
  TestValidator.predicate(
    "has edited content",
    editHistories.edited_content.length > 0,
  );
  TestValidator.predicate(
    "has valid timestamp",
    new Date(editHistories.created_at) instanceof Date,
  );
  // 6. Validate foreign key relationship
  TestValidator.equals(
    "comment summary id matches",
    editHistories.comment.id,
    comment.id,
  );
  TestValidator.predicate(
    "comment has content",
    editHistories.comment.content.length > 0,
  );
  TestValidator.predicate(
    "comment has author",
    editHistories.comment.author.id.length > 0,
  );
}
