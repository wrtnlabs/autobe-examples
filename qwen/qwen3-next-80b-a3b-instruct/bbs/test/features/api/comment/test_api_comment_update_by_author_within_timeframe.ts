import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_comment_update_by_author_within_timeframe(
  connection: api.IConnection,
) {
  const citizen: IDiscussionBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
      } satisfies IDiscussionBoardCitizen.ICreate,
    });
  typia.assert(citizen);

  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.citizen.posts.create(connection, {
      body: "This is a test post content that is more than 10 characters long." satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.citizen.posts.comments.create(
      connection,
      {
        postId: post,
        body: {
          discussion_board_post_id: post,
          content:
            "This is an original comment with valid content that is between 1 and 1000 characters.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.citizen.posts.comments.update(
      connection,
      {
        postId: post,
        commentId: comment.id,
        body: "This is an updated comment content with new text." satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  TestValidator.equals(
    "comment content was updated",
    updatedComment.content,
    "This is an updated comment content with new text.",
  );
  TestValidator.predicate(
    "updated_at timestamp was refreshed",
    updatedComment.updated_at > comment.created_at,
  );
}
