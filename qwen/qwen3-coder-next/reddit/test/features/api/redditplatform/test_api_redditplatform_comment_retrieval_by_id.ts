import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_redditplatform_comment_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random comment for testing
  const comment = typia.random<IRedditPlatformComment>();
  // Test: Retrieve comment by ID
  const retrieved = await api.functional.redditPlatform.posts.comments.at(
    connection,
    {
      postId: comment.post_id,
      commentId: comment.id,
    },
  );
  typia.assert(retrieved);
  // Validate
  TestValidator.equals("comment ID matches", retrieved.id, comment.id);
  TestValidator.equals(
    "author ID matches",
    retrieved.author_id,
    comment.author_id,
  );
  TestValidator.equals("post ID matches", retrieved.post_id, comment.post_id);
  TestValidator.equals("content matches", retrieved.content, comment.content);
  TestValidator.equals(
    "author.id matches",
    retrieved.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "author.username matches",
    retrieved.author.username,
    comment.author.username,
  );
  TestValidator.equals(
    "author.displayName matches",
    retrieved.author.displayName,
    comment.author.displayName,
  );
  TestValidator.equals(
    "author.avatarUrl matches",
    retrieved.author.avatarUrl,
    comment.author.avatarUrl,
  );
  TestValidator.predicate(
    "created_at is date-time",
    (retrieved.created_at as string).length > 0,
  );
  TestValidator.predicate(
    "updated_at is date-time",
    (retrieved.updated_at as string).length > 0,
  );
  TestValidator.equals(
    "vote_score matches",
    retrieved.vote_score,
    comment.vote_score,
  );
}
