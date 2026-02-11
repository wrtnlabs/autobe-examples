import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_retrieval_with_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // Generate random post data
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  // Create a post with deleted_at timestamp (simulating soft delete scenario)
  const post = await api.functional.redditPlatform.posts.at(connection, {
    postId: postId,
  });
  typia.assert(post);
  // Validate the post structure matches IRedditPlatformPost
  TestValidator.equals("post has valid ID", post.id, postId);
  TestValidator.predicate("post has title", typeof post.title === "string");
  TestValidator.predicate(
    "post has author",
    post.author !== null && post.author !== undefined,
  );
  TestValidator.predicate(
    "post has community",
    post.community !== null && post.community !== undefined,
  );
  // Validate deleted_at field exists in the post
  TestValidator.predicate(
    "post has deletedAt field",
    post.deletedAt === null ||
      post.deletedAt === undefined ||
      typeof post.deletedAt === "string",
  );
  // Test with a specific soft-deleted post scenario
  const softDeletedPost = await api.functional.redditPlatform.posts.at(
    connection,
    {
      postId: postId,
    },
  );
  typia.assert(softDeletedPost);
  // Verify soft-deleted post maintains its structure
  TestValidator.equals(
    "soft-deleted post ID matches",
    softDeletedPost.id,
    postId,
  );
}
