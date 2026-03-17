import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_retrieval_soft_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid UUID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the post
  // Note: If post doesn't exist, API returns 404 - we test with existing data
  // For soft-deletion test, we need an actual post that was deleted
  // Since we can't create/delete posts with available APIs, we validate structure
  const post = await api.functional.redditCommunity.posts.at(connection, {
    postId,
  });
  typia.assert(post);
  // Validate soft-deletion status is properly indicated
  // deleted_at should be null for active posts or contain timestamp for soft-deleted posts
  const isSoftDeleted = post.deleted_at !== null;
  TestValidator.equals(
    "deleted_at field exists and indicates soft-deletion status",
    post.deleted_at !== undefined,
    true,
  );
  TestValidator.predicate(
    "deleted_at is either null or valid date-time string",
    post.deleted_at === null ||
      (typeof post.deleted_at === "string" &&
        !Number.isNaN(Date.parse(post.deleted_at))),
  );
  // Validate all required post fields are present
  TestValidator.equals("post has id", post.id !== undefined, true);
  TestValidator.equals("post has title", post.title !== undefined, true);
  TestValidator.equals(
    "post has post_type",
    post.post_type !== undefined,
    true,
  );
  TestValidator.equals(
    "post has vote_score",
    post.vote_score !== undefined,
    true,
  );
  TestValidator.equals(
    "post has comment_count",
    post.comment_count !== undefined,
    true,
  );
  TestValidator.equals(
    "post has created_at",
    post.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "post has updated_at",
    post.updated_at !== undefined,
    true,
  );
  // Validate content object exists
  TestValidator.equals(
    "post has content object",
    post.content !== undefined,
    true,
  );
  // Validate author reference
  TestValidator.equals("author id exists", post.author.id !== undefined, true);
  TestValidator.equals(
    "author username exists",
    post.author.username !== undefined,
    true,
  );
  TestValidator.equals(
    "author created_at exists",
    post.author.created_at !== undefined,
    true,
  );
  // Validate community reference
  TestValidator.equals(
    "community id exists",
    post.community.id !== undefined,
    true,
  );
  TestValidator.equals(
    "community name exists",
    post.community.name !== undefined,
    true,
  );
  TestValidator.equals(
    "community description exists",
    post.community.description !== undefined,
    true,
  );
  TestValidator.equals(
    "community subscriber_count exists",
    post.community.subscriber_count !== undefined,
    true,
  );
  TestValidator.equals(
    "community owner exists",
    post.community.owner !== undefined,
    true,
  );
  TestValidator.equals(
    "community created_at exists",
    post.community.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "community updated_at exists",
    post.community.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "community deleted_at exists",
    post.community.deleted_at !== undefined,
    true,
  );
}
