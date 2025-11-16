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
 * Test creating a text-based Reddit community post with title and content.
 *
 * This test validates the complete post creation workflow including
 * authentication setup, community creation, and text post submission with
 * required field validation.
 *
 * Workflow:
 *
 * 1. Register and authenticate as a community member using the join endpoint
 * 2. Create a new community for posting using the communities endpoint
 * 3. Create a text post with title and content body in the community
 * 4. Validate that all required fields are properly populated
 * 5. Verify post is initialized with zero votes, comments, and correct timestamps
 * 6. Confirm the response contains a complete post entity with all fields
 */
export async function test_api_reddit_post_creation_text_post(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a community member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member created successfully",
    member.email === memberEmail,
  );

  // Step 2: Create a community for posting
  const communityName = RandomGenerator.name()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const uniqueCommunityName = `${communityName}${RandomGenerator.alphaNumeric(6)}`;
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: uniqueCommunityName.slice(0, 21), // Ensure within 3-21 character limit
        title: RandomGenerator.name(2),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
        category_name: "General Discussion",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals(
    "community name matches",
    community.name,
    uniqueCommunityName.slice(0, 21),
  );

  // Step 3: Create a text post with required validation
  const postTitle = RandomGenerator.name(2);
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  // Generate mock UUID for text post type as actual API for fetching post types is not provided
  const textPostTypeId = typia.random<string & tags.Format<"uuid">>();

  // Create the text post
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: postContent,
        reddit_community_id: community.id,
        reddit_post_type_id: textPostTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Validate required fields are populated
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post content matches", post.content, postContent);
  TestValidator.equals("community ID matches", post.community.id, community.id);
  TestValidator.equals("author ID matches", post.author.id, member.id);
  TestValidator.predicate(
    "post type is defined",
    post.post_type !== null && typeof post.post_type !== "undefined",
  );

  // Step 5: Validate post initialization state
  TestValidator.equals("upvote count is zero", post.upvote_count, 0);
  TestValidator.equals("downvote count is zero", post.downvote_count, 0);
  TestValidator.equals("comment count is zero", post.comment_count, 0);
  TestValidator.equals("view count is zero", post.view_count, 0);
  TestValidator.equals("post is not locked", post.is_locked, false);
  TestValidator.equals("post is not pinned", post.is_pinned, false);

  // Step 6: Validate timestamps
  TestValidator.predicate(
    "created_at is valid",
    new Date(post.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(post.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at is recent",
    new Date(post.created_at).getTime() > Date.now() - 60000 &&
      new Date(post.created_at).getTime() <= Date.now(),
  );
}
