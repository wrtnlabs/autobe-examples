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
 * Test creation of a text-based post within a Reddit community.
 *
 * This test validates the complete post creation workflow from member
 * registration through successful text post creation. The test covers:
 *
 * 1. Member account registration with authentication
 * 2. Text post creation with title and content
 * 3. Validation of initialized engagement metrics (upvote_count, downvote_count,
 *    view_count, comment_count)
 * 4. Verification of post metadata and timestamps
 *
 * Since community and post type creation APIs aren't available in the provided
 * materials, this test focuses on validating the post creation process and user
 * authentication workflow, ensuring posts are properly structured and
 * initialized with appropriate zero values for tracking user engagement and
 * platform analytics.
 */
export async function test_api_text_post_creation(connection: api.IConnection) {
  // Step 1: Create a new member account for authentication
  const memberData = {
    nickname: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Verify member account was created successfully
  TestValidator.equals("member email matches", member.email, memberData.email);
  TestValidator.equals(
    "member nickname matches",
    member.nickname,
    memberData.nickname,
  );

  // Step 2: Test post creation with realistic community and post type IDs
  // Note: These IDs should correspond to existing entities in a real scenario
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 3: Validate post creation and content
  TestValidator.equals("post title matches", post.title, postData.title);
  TestValidator.equals("post content matches", post.content, postData.content);
  TestValidator.equals("post is not locked initially", post.is_locked, false);
  TestValidator.equals("post is not pinned initially", post.is_pinned, false);

  // Step 4: Validate engagement metrics are initialized to zero
  TestValidator.equals("upvote count is zero", post.upvote_count, 0);
  TestValidator.equals("downvote count is zero", post.downvote_count, 0);
  TestValidator.equals("view count is zero", post.view_count, 0);
  TestValidator.equals("comment count is zero", post.comment_count, 0);

  // Step 5: Validate author association
  TestValidator.equals(
    "post author ID matches member",
    post.author.id,
    member.id,
  );
  TestValidator.equals(
    "post author nickname matches member",
    post.author.nickname,
    member.nickname,
  );

  // Step 6: Validate timestamps are created
  TestValidator.predicate("created_at is a valid datetime", () => {
    return new Date(post.created_at).toString() !== "Invalid Date";
  });
  TestValidator.predicate("updated_at is a valid datetime", () => {
    return new Date(post.updated_at).toString() !== "Invalid Date";
  });
}
