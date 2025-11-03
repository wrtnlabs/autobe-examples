import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_comment_creation_by_citizen(
  connection: api.IConnection,
) {
  // 1. Citizen registers
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!";
  const citizen: IDiscussionBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: { email, password } satisfies IDiscussionBoardCitizen.ICreate,
    });
  typia.assert(citizen);

  // 2. Citizen creates a post
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const postId: IDiscussionBoardPost =
    await api.functional.discussionBoard.citizen.posts.create(connection, {
      body: postTitle satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(postId);

  // 3. Citizen creates a comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.citizen.comments.create(connection, {
      body: {
        discussion_board_post_id: postId,
        content: commentContent,
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(comment);

  // 4. Validate comment properties
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment has correct post reference",
    comment.discussion_board_post_id,
    postId,
  );
  TestValidator.equals(
    "comment has correct author type",
    comment.author_type,
    "citizen",
  );
  TestValidator.equals("comment has correct status", comment.status, "active");
  TestValidator.predicate(
    "content length within limit",
    comment.content.length >= 1 && comment.content.length <= 1000,
  );
}
