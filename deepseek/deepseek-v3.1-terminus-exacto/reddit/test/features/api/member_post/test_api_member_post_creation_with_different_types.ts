import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test post creation with different content types (text, link, media, poll) to
 * validate type-specific content handling and ensure each type is properly
 * processed with appropriate validation rules, storage mechanisms, and display
 * characteristics.
 */
export async function test_api_member_post_creation_with_different_types(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community UUID for post association
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test text post creation
  const textPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  TestValidator.equals("text post type is correct", textPost.post_type, "text");
  TestValidator.equals(
    "text post status is published",
    textPost.status,
    "published",
  );
  TestValidator.equals(
    "text post community ID matches",
    textPost.community_platform_community_id,
    communityId,
  );

  // Step 4: Test link post creation
  const linkPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "link",
        status: "draft",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals("link post type is correct", linkPost.post_type, "link");
  TestValidator.equals("link post status is draft", linkPost.status, "draft");
  TestValidator.equals(
    "link post community ID matches",
    linkPost.community_platform_community_id,
    communityId,
  );

  // Step 5: Test media post creation
  const mediaPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        post_type: "media",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(mediaPost);
  TestValidator.equals(
    "media post type is correct",
    mediaPost.post_type,
    "media",
  );
  TestValidator.equals(
    "media post status is published",
    mediaPost.status,
    "published",
  );
  TestValidator.equals(
    "media post community ID matches",
    mediaPost.community_platform_community_id,
    communityId,
  );

  // Step 6: Test poll post creation
  const pollPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }),
        post_type: "poll",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(pollPost);
  TestValidator.equals("poll post type is correct", pollPost.post_type, "poll");
  TestValidator.equals(
    "poll post status is published",
    pollPost.status,
    "published",
  );
  TestValidator.equals(
    "poll post community ID matches",
    pollPost.community_platform_community_id,
    communityId,
  );

  // Step 7: Test archived post creation
  const archivedPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        status: "archived",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(archivedPost);
  TestValidator.equals(
    "archived post type is correct",
    archivedPost.post_type,
    "text",
  );
  TestValidator.equals(
    "archived post status is archived",
    archivedPost.status,
    "archived",
  );
  TestValidator.equals(
    "archived post community ID matches",
    archivedPost.community_platform_community_id,
    communityId,
  );

  // Step 8: Verify all posts have unique IDs
  const postIds = [
    textPost.id,
    linkPost.id,
    mediaPost.id,
    pollPost.id,
    archivedPost.id,
  ];
  const uniqueIds = new Set(postIds);
  TestValidator.equals(
    "all post IDs are unique",
    uniqueIds.size,
    postIds.length,
  );

  // Step 9: Verify post properties are correctly set
  const posts = [textPost, linkPost, mediaPost, pollPost, archivedPost];
  for (const post of posts) {
    TestValidator.predicate(
      "post has valid title length",
      post.title.length >= 5 && post.title.length <= 300,
    );
    TestValidator.predicate(
      "post has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.id,
      ),
    );
    TestValidator.equals(
      "post community ID matches input",
      post.community_platform_community_id,
      communityId,
    );
    TestValidator.predicate("post has valid score", post.score >= 0);
    TestValidator.predicate("post has valid view count", post.view_count >= 0);
    TestValidator.predicate(
      "post has valid comment count",
      post.comment_count >= 0,
    );
  }
}
