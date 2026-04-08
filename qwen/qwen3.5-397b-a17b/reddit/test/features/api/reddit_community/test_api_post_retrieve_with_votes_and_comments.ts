import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a post with votes and comments aggregation fields.
 *
 * Validates the post retrieval endpoint returns correct voteScore and commentsCount fields. The voteScore represents the sum of all vote values (upvotes +1, downvotes -1), and commentsCount represents non-deleted comments.
 *
 * Note: This test validates the response structure and type correctness. Full aggregation testing requires post creation, voting, and commenting endpoints which are not available in the current API function set.
 *
 * 1. Retrieve post by UUID.
 * 2. Validate response structure including voteScore and commentsCount fields.
 * 3. Verify post has required author and community information.
 * 4. Validate postType is one of the expected content types (text, link, image).
 */
export async function test_api_post_retrieve_with_votes_and_comments(
  connection: api.IConnection,
): Promise<void> {
  const post = await api.functional.redditCommunity.posts.at(connection, {
    postId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(post);
  TestValidator.predicate(
    "post has author information",
    post.author !== undefined && post.author.id !== undefined,
  );
  TestValidator.predicate(
    "post has community information",
    post.community !== undefined && post.community.id !== undefined,
  );
  TestValidator.predicate(
    "postType is valid content type",
    ["text", "link", "image"].includes(post.postType),
  );
  TestValidator.predicate(
    "post has title",
    post.title !== undefined && post.title.length > 0,
  );
}
