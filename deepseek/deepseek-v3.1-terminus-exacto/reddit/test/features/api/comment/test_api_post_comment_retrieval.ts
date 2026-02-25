import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_comment_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Since the endpoint has no authorization requirement, we can use the base connection directly
  // Both guest (unauthenticated) and authenticated users should be able to access this endpoint
  // We'll test with random UUIDs as the API will return mock data in simulation mode
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Call the comment retrieval endpoint
  const comment = await api.functional.communityPlatform.posts.comments.at(
    connection,
    {
      postId,
      commentId,
    },
  );
  // Validate the response matches the complete ICommunityPlatformComment structure
  // typia.assert() validates ALL type information including:
  // - All property existence checks
  // - All type checks (string, number, boolean, etc.)
  // - All format validations (UUID, date-time, etc.)
  // - All constraint validations
  typia.assert(comment);
  // Business logic validations (NOT type validations)
  // Verify the comment belongs to the specified post
  TestValidator.equals(
    "comment belongs to specified post",
    comment.post.id,
    postId,
  );
  // Verify the comment ID matches
  TestValidator.equals("comment ID matches", comment.id, commentId);
}
