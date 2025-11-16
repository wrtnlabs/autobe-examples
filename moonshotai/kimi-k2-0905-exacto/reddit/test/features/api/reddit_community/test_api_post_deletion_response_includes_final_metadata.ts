import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test comprehensive final metadata in post deletion response.
 *
 * This e2e test validates that the deletion of a post from the Reddit Community
 * platform provides complete final metadata including all engagement metrics
 * and timestamps. The comprehensive audit information is essential for
 * administrative purposes and ensures data retention compliance within the
 * platform.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a member account
 * 2. Create a new post in the community with optional engagement tracking
 * 3. Delete the post and verify comprehensive metadata in response
 * 4. Validate all audit fields including counts and timestamps
 *
 * The deletion response should include complete final metadata including:
 *
 * - Upvote_count - final number of upvotes received
 * - Downvote_count - final number of downvotes received
 * - View_count - total number of times the post was viewed
 * - Comment_count - total number of comments on the post
 * - Created_at - post creation timestamp for audit trail
 * - Updated_at - last modification timestamp before deletion
 * - Id - unique identifier for deletion reference
 * - Author - member summary for accountability
 * - Community - community summary for context
 * - Post_type - type classification for audit purposes
 * - Title - final title before deletion
 * - Content - final content body before deletion
 */
export async function test_api_post_deletion_response_includes_final_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create member account through authentication
  const memberRequestBody = {
    nickname: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberRequestBody,
  });
  typia.assert(memberAuth);

  // Step 2: Create a post with comprehensive data
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    reddit_community_id: communityId,
    reddit_post_type_id: postTypeId,
  } satisfies IRedditCommunityPost.ICreate;

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: createPostBody,
    },
  );
  typia.assert(createdPost);

  // Step 3: Delete the post and capture comprehensive response
  const deletionResponse =
    await api.functional.redditCommunity.member.posts.erase(connection, {
      postId: createdPost.id,
    });
  typia.assert(deletionResponse);

  // Step 4: Validate comprehensive final metadata in deletion response
  // Core identity fields
  TestValidator.equals(
    "post has UUID identifier",
    deletionResponse.id,
    createdPost.id,
  );
  TestValidator.equals(
    "post title retained",
    deletionResponse.title,
    createdPost.title,
  );
  TestValidator.equals(
    "post content retained",
    deletionResponse.content,
    createdPost.content,
  );

  // Engagement metrics for audit
  TestValidator.predicate(
    "upvote_count is non-negative",
    deletionResponse.upvote_count >= 0,
  );
  TestValidator.predicate(
    "downvote_count is non-negative",
    deletionResponse.downvote_count >= 0,
  );
  TestValidator.predicate(
    "view_count is non-negative",
    deletionResponse.view_count >= 0,
  );
  TestValidator.predicate(
    "comment_count is non-negative",
    deletionResponse.comment_count >= 0,
  );

  // Timestamp auditing
  TestValidator.predicate(
    "created_at exists",
    deletionResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    deletionResponse.updated_at.length > 0,
  );

  // State indicators
  TestValidator.predicate(
    "is_locked is boolean",
    typeof deletionResponse.is_locked === "boolean",
  );
  TestValidator.predicate(
    "is_pinned is boolean",
    typeof deletionResponse.is_pinned === "boolean",
  );

  // Author accountability
  TestValidator.predicate(
    "author summary exists",
    deletionResponse.author !== null,
  );
  TestValidator.equals(
    "author has ID",
    deletionResponse.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "author has email",
    deletionResponse.author.email,
    memberAuth.email,
  );

  // Context preservation
  TestValidator.predicate(
    "community summary exists",
    deletionResponse.community !== null,
  );
  TestValidator.predicate(
    "post type summary exists",
    deletionResponse.post_type !== null,
  );

  // Optional URL validation
  TestValidator.predicate(
    "link_url format valid when present",
    deletionResponse.link_url === null ||
      deletionResponse.link_url === undefined ||
      deletionResponse.link_url.match(/^https?:\/\/.+/i) !== null,
  );
}
