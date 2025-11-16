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
 * Test automatic timestamp generation for newly created posts with both
 * created_at and updated_at fields set to the moment of creation. Validates
 * that the platform automatically manages temporal tracking for audit purposes
 * and that both timestamps are identical for initial posts, supporting activity
 * logging and chronological content organization throughout the Reddit
 * Community platform.
 */
export async function test_api_post_creation_timestamps_generation(
  connection: api.IConnection,
) {
  // Step 1: Register a new community member to obtain authentication
  const memberData = typia.random<IRedditCommunityMember.ICreate>();
  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Generate test data for post creation
  // We'll need community_id and post_type_id for creating a post
  // Generate valid IDs for testing (these would normally come from existing communities/types)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  // Create post content
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
  });

  // Step 3: Create a new post using the member API endpoint
  const createData = {
    title: postTitle,
    content: postContent,
    reddit_community_id: communityId,
    reddit_post_type_id: postTypeId,
  } satisfies IRedditCommunityPost.ICreate;

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: createData,
    },
  );
  typia.assert(createdPost);

  // Step 4: Validate that timestamps are present in the response
  TestValidator.predicate(
    "created_at timestamp exists",
    createdPost.created_at !== null && createdPost.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    createdPost.updated_at !== null && createdPost.updated_at !== undefined,
  );

  // Step 5: Verify both timestamps are identical for initial post creation
  TestValidator.equals(
    "created_at and updated_at are identical for new post",
    createdPost.created_at,
    createdPost.updated_at,
  );

  // Step 6: Validate timestamp format (ISO 8601 date-time)
  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      createdPost.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      createdPost.updated_at,
    ),
  );

  // Step 7: Validate that the post was successfully created with expected properties
  TestValidator.equals(
    "title matches creation data",
    createdPost.title,
    createData.title,
  );
  TestValidator.equals(
    "content matches creation data",
    createdPost.content,
    createData.content,
  );
  TestValidator.equals(
    "community_id matches creation data",
    createdPost.community.id,
    communityId,
  );
  TestValidator.equals(
    "post_type_id matches creation data",
    createdPost.post_type.id,
    postTypeId,
  );

  // Verify basic post properties
  TestValidator.predicate(
    "upvote_count is non-negative",
    createdPost.upvote_count >= 0,
  );
  TestValidator.predicate(
    "downvote_count is non-negative",
    createdPost.downvote_count >= 0,
  );
  TestValidator.predicate(
    "view_count is non-negative",
    createdPost.view_count >= 0,
  );
  TestValidator.predicate(
    "comment_count is non-negative",
    createdPost.comment_count >= 0,
  );
  TestValidator.equals(
    "post is not locked by default",
    createdPost.is_locked,
    false,
  );
  TestValidator.equals(
    "post is not pinned by default",
    createdPost.is_pinned,
    false,
  );
}
