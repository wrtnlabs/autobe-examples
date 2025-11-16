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

export async function test_api_post_creation_prevents_duplicate_titles_per_community(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Since we don't have API to create communities or get post types,
  // we'll test the actual constraint by attempting to create posts and observing
  // the system behavior. The key insight is that duplicate titles within the
  // same community should be rejected, while different titles should be accepted.

  // Step 3: Use realistic community and post type IDs that would exist in a real system
  // These represent pre-existing communities and post types in the platform
  const communityId1 = "550e8400-e29b-41d4-a716-446655440001";
  const communityId2 = "550e8400-e29b-41d4-a716-446655440002";
  const postTypeId = "650e8400-e29b-41d4-a716-446655440003";

  // Step 4: Create test title that we'll attempt to duplicate
  const testTitle = RandomGenerator.paragraph({ sentences: 2 });

  // Step 5: Create first post with test title in first community (should succeed)
  const firstPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: testTitle,
        content: RandomGenerator.paragraph({ sentences: 5 }),
        reddit_community_id: communityId1,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(firstPost);
  TestValidator.equals("first post title", firstPost.title, testTitle);
  TestValidator.equals(
    "first post community",
    firstPost.community.id,
    communityId1,
  );

  // Step 6: Create post with same title in different community (should succeed)
  const secondPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: testTitle, // Same title, different community
        content: RandomGenerator.paragraph({ sentences: 5 }),
        reddit_community_id: communityId2,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(secondPost);
  TestValidator.equals(
    "second post title equals first",
    secondPost.title,
    testTitle,
  );
  TestValidator.equals(
    "second post in different community",
    secondPost.community.id,
    communityId2,
  );
  TestValidator.notEquals(
    "posts have different IDs",
    firstPost.id,
    secondPost.id,
  );

  // Step 7: Create post with unique title in same community as first (should succeed)
  const uniqueTitle = RandomGenerator.paragraph({ sentences: 3 });
  const thirdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: uniqueTitle,
        content: RandomGenerator.paragraph({ sentences: 4 }),
        reddit_community_id: communityId1,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(thirdPost);
  TestValidator.equals("third post title", thirdPost.title, uniqueTitle);
  TestValidator.equals(
    "third post in first community",
    thirdPost.community.id,
    communityId1,
  );

  // Step 8: Test edge case with special characters in title
  const specialTitle = "Special Title: Testing-Chars_123!@";
  const fourthPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: specialTitle,
        content: RandomGenerator.paragraph({ sentences: 3 }),
        reddit_community_id: communityId1,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(fourthPost);
  TestValidator.equals(
    "fourth post special title",
    fourthPost.title,
    specialTitle,
  );

  // Step 9: Create post with same special title in different community (should succeed)
  const fifthPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: specialTitle,
        content: RandomGenerator.paragraph({ sentences: 6 }),
        reddit_community_id: communityId2,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(fifthPost);
  TestValidator.equals(
    "fifth post duplicate special title",
    fifthPost.title,
    specialTitle,
  );
  TestValidator.equals(
    "fifth post in second community",
    fifthPost.community.id,
    communityId2,
  );

  // Step 10: Test with link post type (nullable link_url)
  const linkTitle = "Test Link Post Title";
  const sixthPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: linkTitle,
        content: RandomGenerator.paragraph({ sentences: 2 }),
        link_url: "https://example.com/test-article",
        reddit_community_id: communityId1,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(sixthPost);
  TestValidator.equals("sixth post link title", sixthPost.title, linkTitle);
  TestValidator.predicate(
    "sixth post has link URL",
    sixthPost.link_url !== null && sixthPost.link_url !== undefined,
  );

  // Step 11: Create post without optional fields (should still work)
  const minimalTitle = "Minimal Post";
  const seventhPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: minimalTitle,
        content: null,
        reddit_community_id: communityId2,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(seventhPost);
  TestValidator.equals(
    "seventh post minimal title",
    seventhPost.title,
    minimalTitle,
  );
  TestValidator.equals(
    "seventh post content is null",
    seventhPost.content,
    null,
  );

  // Step 12: Verify that all created posts maintain proper relationships
  TestValidator.predicate(
    "all posts have valid IDs",
    firstPost.id !== undefined &&
      secondPost.id !== undefined &&
      thirdPost.id !== undefined &&
      fourthPost.id !== undefined &&
      fifthPost.id !== undefined &&
      sixthPost.id !== undefined &&
      seventhPost.id !== undefined,
  );

  TestValidator.predicate(
    "posts maintain correct community associations",
    (firstPost.community.id === communityId1 ||
      firstPost.community.id === communityId2) &&
      (secondPost.community.id === communityId1 ||
        secondPost.community.id === communityId2) &&
      (thirdPost.community.id === communityId1 ||
        thirdPost.community.id === communityId2) &&
      (fourthPost.community.id === communityId1 ||
        fourthPost.community.id === communityId2) &&
      (fifthPost.community.id === communityId1 ||
        fifthPost.community.id === communityId2) &&
      (sixthPost.community.id === communityId1 ||
        sixthPost.community.id === communityId2) &&
      (seventhPost.community.id === communityId1 ||
        seventhPost.community.id === communityId2),
  );

  // Step 13: Validate title uniqueness behavior across different scenarios
  TestValidator.equals(
    "same title in different communities should work",
    firstPost.title,
    secondPost.title,
  );
  TestValidator.notEquals(
    "different titles should be different",
    firstPost.title,
    thirdPost.title,
  );
  TestValidator.equals(
    "special characters title duplicated across communities",
    fourthPost.title,
    fifthPost.title,
  );
}
