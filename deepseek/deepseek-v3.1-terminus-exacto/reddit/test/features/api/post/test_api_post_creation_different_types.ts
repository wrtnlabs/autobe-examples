import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Comprehensive test for post creation with all supported content types (text,
 * link, media, poll) to validate type-specific handling and consistent core
 * post attributes.
 *
 * This test creates a member account, establishes a community, and then creates
 * posts of each type to verify proper validation, storage mechanisms, and
 * attribute consistency across different post types.
 */
export async function test_api_post_creation_different_types(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12); // Increased for better security

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create community for post hosting
  const communityName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 7,
  }); // Ensure proper length
  const communitySlug = RandomGenerator.alphaNumeric(15).toLowerCase(); // URL-safe format

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create text post with rich content formatting
  const textPostTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  }); // Ensure proper title length
  const textPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: textPostTitle,
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  TestValidator.equals(
    "text post type should be 'text'",
    textPost.post_type,
    "text",
  );
  TestValidator.equals(
    "text post community ID should match",
    textPost.community_platform_community_id,
    community.id,
  );

  // 4. Create link post with external URL validation
  const linkPostTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const linkPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: linkPostTitle,
        post_type: "link",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals(
    "link post type should be 'link'",
    linkPost.post_type,
    "link",
  );
  TestValidator.equals(
    "link post community ID should match",
    linkPost.community_platform_community_id,
    community.id,
  );

  // 5. Create media post with file handling capabilities
  const mediaPostTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const mediaPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: mediaPostTitle,
        post_type: "media",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(mediaPost);
  TestValidator.equals(
    "media post type should be 'media'",
    mediaPost.post_type,
    "media",
  );
  TestValidator.equals(
    "media post community ID should match",
    mediaPost.community_platform_community_id,
    community.id,
  );

  // 6. Create poll post with voting options
  const pollPostTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const pollPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: pollPostTitle,
        post_type: "poll",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(pollPost);
  TestValidator.equals(
    "poll post type should be 'poll'",
    pollPost.post_type,
    "poll",
  );
  TestValidator.equals(
    "poll post community ID should match",
    pollPost.community_platform_community_id,
    community.id,
  );

  // 7. Validate consistent core attributes across all post types
  const allPosts = [textPost, linkPost, mediaPost, pollPost];

  TestValidator.equals(
    "all posts should have consistent title length",
    allPosts.every(
      (post) => post.title.length >= 5 && post.title.length <= 300,
    ),
    true,
  );

  TestValidator.equals(
    "all posts should have published status",
    allPosts.every((post) => post.status === "published"),
    true,
  );

  TestValidator.equals(
    "all posts should belong to the same community",
    allPosts.every(
      (post) => post.community_platform_community_id === community.id,
    ),
    true,
  );

  TestValidator.equals(
    "all posts should have unique IDs",
    new Set(allPosts.map((post) => post.id)).size,
    allPosts.length,
  );
}
