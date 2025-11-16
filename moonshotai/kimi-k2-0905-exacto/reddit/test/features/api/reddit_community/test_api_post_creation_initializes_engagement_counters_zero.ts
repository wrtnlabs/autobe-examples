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
 * Test that newly created posts initialize their engagement statistics to zero
 * values including upvote_count, downvote_count, view_count, and comment_count.
 * Validates that posts start with no community interaction data and that
 * initial values reflect newly published content state, enabling accurate
 * engagement tracking from the moment of publication.
 *
 * Test steps:
 *
 * 1. Join as a member to get authenticated
 * 2. Create a new post with proper community and post type references
 * 3. Verify that all engagement counters are initialized to zero
 * 4. Validate that the post was created successfully with correct initial state
 */
export async function test_api_post_creation_initializes_engagement_counters_zero(
  connection: api.IConnection,
) {
  // Step 1: Join as a member to establish authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    nickname: RandomGenerator.alphaNumeric(10),
    password: "Password123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create test data for post creation
  const postTypeId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const postCreationData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    reddit_community_id: communityId,
    reddit_post_type_id: postTypeId,
  } satisfies IRedditCommunityPost.ICreate;

  // Step 3: Create the post and verify engagement counters are zero
  const createdPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postCreationData,
    });
  typia.assert(createdPost);

  // Step 4: Validate that all engagement counters are initialized to zero
  TestValidator.equals(
    "upvote_count should be zero",
    createdPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "downvote_count should be zero",
    createdPost.downvote_count,
    0,
  );
  TestValidator.equals("view_count should be zero", createdPost.view_count, 0);
  TestValidator.equals(
    "comment_count should be zero",
    createdPost.comment_count,
    0,
  );

  // Step 5: Validate other post properties for completeness
  TestValidator.equals(
    "post title matches input",
    createdPost.title,
    postCreationData.title,
  );
  TestValidator.equals(
    "post content matches input",
    createdPost.content,
    postCreationData.content,
  );
  TestValidator.equals("post is not locked", createdPost.is_locked, false);
  TestValidator.equals("post is not pinned", createdPost.is_pinned, false);
  TestValidator.predicate("post has valid ID", () => createdPost.id.length > 0);
  TestValidator.predicate(
    "post has created timestamp",
    () => createdPost.created_at.length > 0,
  );
  TestValidator.predicate(
    "post has updated timestamp",
    () => createdPost.updated_at.length > 0,
  );
  TestValidator.predicate(
    "author is properly set",
    () => createdPost.author.id === member.id,
  );
  TestValidator.predicate(
    "community is set",
    () => createdPost.community.id === communityId,
  );
  TestValidator.predicate(
    "post type is set",
    () => createdPost.post_type.id === postTypeId,
  );
}
