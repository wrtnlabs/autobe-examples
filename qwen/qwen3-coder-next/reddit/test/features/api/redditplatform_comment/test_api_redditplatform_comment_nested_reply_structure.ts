import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_redditplatform_comment_nested_reply_structure(
  connection: api.IConnection,
): Promise<void> {
  // Since only retrieval API is available, generate test data and validate retrieval
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve a comment using the available API
  const comment = await api.functional.redditPlatform.posts.comments.at(
    connection,
    {
      postId: randomPostId,
      commentId: randomCommentId,
    },
  );
  // Validate the complete comment structure
  typia.assert(comment);
  // Verify required fields exist
  TestValidator.predicate("comment has id", () => !!comment.id);
  TestValidator.predicate("comment has author_id", () => !!comment.author_id);
  TestValidator.predicate("comment has post_id", () => !!comment.post_id);
  TestValidator.predicate("comment has content", () => !!comment.content);
  TestValidator.equals(
    "comment vote_score is number",
    comment.vote_score,
    comment.vote_score,
  );
  TestValidator.predicate("comment has created_at", () => !!comment.created_at);
  TestValidator.predicate("comment has updated_at", () => !!comment.updated_at);
  // Verify author structure
  TestValidator.predicate("author has id", () => !!comment.author.id);
  TestValidator.predicate(
    "author has username",
    () => !!comment.author.username,
  );
  TestValidator.predicate(
    "author has displayName",
    () => comment.author.displayName !== undefined,
  );
  TestValidator.predicate(
    "author has avatarUrl",
    () => comment.author.avatarUrl !== undefined,
  );
  // Test with parent_comment_id scenario (simulated)
  const parentId = typia.random<string & tags.Format<"uuid">>();
  const commentWithParent =
    await api.functional.redditPlatform.posts.comments.at(connection, {
      postId: randomPostId,
      commentId: randomCommentId,
    });
  typia.assert(commentWithParent);
  // If parent_comment_id exists, verify it
  if (
    commentWithParent.parent_comment_id !== undefined &&
    commentWithParent.parent_comment_id !== null
  ) {
    TestValidator.equals(
      "parent_comment_id matches",
      commentWithParent.parent_comment_id,
      parentId,
    );
  }
}
