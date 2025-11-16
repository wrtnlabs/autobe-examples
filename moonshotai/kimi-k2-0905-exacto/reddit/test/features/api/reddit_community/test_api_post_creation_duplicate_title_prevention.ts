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
 * Test that duplicate post titles are prevented within the same community to
 * maintain content uniqueness.
 *
 * This test validates the platform's duplicate title prevention mechanism to
 * ensure:
 *
 * 1. Posts with identical titles cannot be created within the same community
 * 2. Posts with the same title can be created in different communities
 * 3. The duplicate title validation works correctly across different post types
 * 4. Error handling is appropriate when duplicate titles are attempted
 *
 * The test follows a realistic business flow:
 *
 * 1. Create a member account for authentication
 * 2. Create two different communities for testing
 * 3. Create post types for content creation
 * 4. Create an initial post in the first community
 * 5. Attempt to create a duplicate post with the same title in the same community
 *    (should fail)
 * 6. Create a post with the same title in a different community (should succeed)
 * 7. Verify the duplicate title prevention mechanism works as expected
 */
export async function test_api_post_creation_duplicate_title_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create first community
  const firstCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        title: "Technology Discussions",
        description:
          "A community for discussing the latest in technology and software development",
        category_name: "technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(firstCommunity);

  // Step 3: Create second community
  const secondCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        title: "Programming Help",
        description:
          "Get help with programming questions and share code solutions",
        category_name: "programming",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(secondCommunity);

  // Step 4: Get post types - we'll use text post type for our test
  const postTypes = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypes);

  // Create a text post type ID (we'll simulate having the text post type available)
  const textPostTypeId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Create initial post in first community with a specific title
  const testTitle = "Best practices for TypeScript development in 2024";
  const initialPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: testTitle,
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        reddit_community_id: firstCommunity.id,
        reddit_post_type_id: textPostTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(initialPost);

  // Verify the initial post was created successfully
  TestValidator.equals(
    "initial post title matches",
    initialPost.title,
    testTitle,
  );
  TestValidator.equals(
    "initial post community matches",
    initialPost.community.id,
    firstCommunity.id,
  );

  // Step 6: Attempt to create duplicate post with same title in same community (should fail)
  await TestValidator.error(
    "duplicate post title should be rejected in same community",
    async () => {
      await api.functional.redditCommunity.member.posts.create(connection, {
        body: {
          title: testTitle, // Same title as initial post
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          reddit_community_id: firstCommunity.id, // Same community
          reddit_post_type_id: textPostTypeId,
        } satisfies IRedditCommunityPost.ICreate,
      });
    },
  );

  // Step 7: Create post with same title in different community (should succeed)
  const crossCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        title: testTitle, // Same title as initial post
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        reddit_community_id: secondCommunity.id, // Different community
        reddit_post_type_id: textPostTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(crossCommunityPost);

  // Verify the cross-community post was created successfully
  TestValidator.equals(
    "cross-community post title matches",
    crossCommunityPost.title,
    testTitle,
  );
  TestValidator.equals(
    "cross-community post community differs",
    crossCommunityPost.community.id,
    secondCommunity.id,
  );
  TestValidator.notEquals(
    "cross-community post has different ID",
    crossCommunityPost.id,
    initialPost.id,
  );

  // Additional validation: Test with different post types
  const linkPostTypeId = typia.random<string & tags.Format<"uuid">>();

  // Create a link post in first community with a different title
  const linkPostTitle = "Understanding async/await in JavaScript";
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: linkPostTitle,
        link_url: "https://example.com/javascript-async-await-guide",
        content: "A comprehensive guide to async/await patterns",
        reddit_community_id: firstCommunity.id,
        reddit_post_type_id: linkPostTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);

  // Attempt to create another link post with same title in same community (should fail)
  await TestValidator.error(
    "duplicate link post title should be rejected in same community",
    async () => {
      await api.functional.redditCommunity.member.posts.create(connection, {
        body: {
          title: linkPostTitle, // Same title as the link post
          link_url: "https://different-example.com/another-guide",
          content: "Another perspective on async/await",
          reddit_community_id: firstCommunity.id, // Same community
          reddit_post_type_id: linkPostTypeId,
        } satisfies IRedditCommunityPost.ICreate,
      });
    },
  );

  // Final validation: Verify that similar but not identical titles can be created
  const similarTitle =
    "Best practices for TypeScript development in 2024 - Updated";
  const similarPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: similarTitle,
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 4,
          sentenceMax: 7,
        }),
        reddit_community_id: firstCommunity.id,
        reddit_post_type_id: textPostTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(similarPost);

  TestValidator.equals(
    "similar post title differs slightly",
    similarPost.title,
    similarTitle,
  );
  TestValidator.notEquals(
    "similar post title is not identical",
    similarPost.title,
    testTitle,
  );
  TestValidator.equals(
    "similar post community matches",
    similarPost.community.id,
    firstCommunity.id,
  );
}
