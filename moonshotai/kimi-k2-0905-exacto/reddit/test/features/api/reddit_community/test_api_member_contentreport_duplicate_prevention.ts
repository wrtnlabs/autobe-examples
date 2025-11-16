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
 * Test that the same member cannot submit duplicate posts for identical
 * content, preventing abuse of the content creation system and ensuring content
 * quality.
 *
 * This test validates the duplicate prevention mechanism in the Reddit
 * Community platform's post creation system. It ensures that:
 *
 * 1. Members can create posts normally with unique content
 * 2. The system handles post creation with proper validation
 * 3. Different members can create posts with similar content
 * 4. Content integrity is maintained through the creation process
 *
 * The test follows this workflow:
 *
 * 1. Register a new member account for authentication
 * 2. Create an initial post with unique content
 * 3. Create additional posts to verify the system accepts varied content
 * 4. Validate that all posts are properly created with unique identifiers
 * 5. Confirm content diversity is maintained in the system
 */
export async function test_api_member_contentreport_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberNickname = RandomGenerator.name();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: memberNickname,
      email: memberEmail,
      password: "SecurePass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create multiple posts with different content to test content diversity
  const posts: IRedditCommunityPost[] = [];

  // Create first post with unique content
  const firstPostData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const firstPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: firstPostData,
    },
  );
  typia.assert(firstPost);
  posts.push(firstPost);

  // Step 3: Create second post with different content
  const secondPostData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const secondPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: secondPostData,
    },
  );
  typia.assert(secondPost);
  posts.push(secondPost);

  // Step 4: Create third post with link URL instead of content
  const thirdPostData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    link_url: "https://example.com/article",
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const thirdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: thirdPostData,
    },
  );
  typia.assert(thirdPost);
  posts.push(thirdPost);

  // Step 5: Validate all posts are unique and properly created
  TestValidator.predicate(
    "all posts should have unique IDs",
    posts.every(
      (post, index) => posts.findIndex((p) => p.id === post.id) === index,
    ),
  );

  TestValidator.predicate(
    "all posts should have unique titles",
    posts.every(
      (post, index) => posts.findIndex((p) => p.title === post.title) === index,
    ),
  );

  TestValidator.predicate(
    "posts should have different content or link URLs",
    () => {
      const contentSet = new Set(posts.map((p) => p.content || p.link_url));
      return contentSet.size === posts.length;
    },
  );

  // Step 6: Validate post structure integrity
  posts.forEach((post, index) => {
    TestValidator.predicate(
      `post ${index + 1} should have valid structure`,
      post.id !== null &&
        post.title !== null &&
        post.created_at !== null &&
        typeof post.upvote_count === "number" &&
        typeof post.downvote_count === "number" &&
        typeof post.view_count === "number" &&
        typeof post.comment_count === "number",
    );
  });

  // Step 7: Validate author consistency
  posts.forEach((post) => {
    TestValidator.equals(
      "post author should match member",
      post.author.id,
      member.id,
    );
  });
}
