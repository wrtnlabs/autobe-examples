import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_top_posts_feed_respects_visibility_and_moderation(
  connection: api.IConnection,
) {
  // 1. Register a member user (creator) who will own communities and posts.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const creator = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(creator);

  // 2. Create a public community.
  const publicCommunityBody = {
    slug: `public-${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const publicCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: publicCommunityBody },
    );
  typia.assert(publicCommunity);

  TestValidator.equals(
    "public community should have visibility 'public'",
    publicCommunity.visibility,
    "public",
  );

  // 3. Create a restricted/private community.
  const restrictedCommunityBody = {
    slug: `restricted-${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "restricted",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const restrictedCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: restrictedCommunityBody },
    );
  typia.assert(restrictedCommunity);

  TestValidator.equals(
    "restricted community should have visibility 'restricted'",
    restrictedCommunity.visibility,
    "restricted",
  );

  TestValidator.notEquals(
    "public and restricted communities should be different",
    publicCommunity.id,
    restrictedCommunity.id,
  );

  // 4. Create several posts in the public community.
  const publicPosts: ICommunityPlatformPost[] = [];
  const publicPostCount = 3;

  for (let i = 0; i < publicPostCount; i++) {
    const body = {
      communityId: publicCommunity.id,
      communityCode: publicCommunity.slug,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.paragraph({ sentences: 8 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post = await api.functional.communityPlatform.memberUser.posts.create(
      connection,
      { body },
    );
    typia.assert(post);
    publicPosts.push(post);
  }

  TestValidator.equals(
    "number of created public posts should match",
    publicPosts.length,
    publicPostCount,
  );

  // 5. Create several posts in the restricted community.
  const restrictedPosts: ICommunityPlatformPost[] = [];
  const restrictedPostCount = 2;

  for (let i = 0; i < restrictedPostCount; i++) {
    const body = {
      communityId: restrictedCommunity.id,
      communityCode: restrictedCommunity.slug,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.paragraph({ sentences: 8 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post = await api.functional.communityPlatform.memberUser.posts.create(
      connection,
      { body },
    );
    typia.assert(post);
    restrictedPosts.push(post);
  }

  TestValidator.equals(
    "number of created restricted posts should match",
    restrictedPosts.length,
    restrictedPostCount,
  );

  // 6. Validate that each post is tied to the correct community.
  for (const post of publicPosts) {
    TestValidator.equals(
      "public post must belong to public community",
      post.community_id,
      publicCommunity.id,
    );
  }

  for (const post of restrictedPosts) {
    TestValidator.equals(
      "restricted post must belong to restricted community",
      post.community_id,
      restrictedCommunity.id,
    );
  }

  // NOTE: We cannot call the actual top posts feed or moderation endpoints
  // because they are not available in the SDK materials. Therefore, we
  // restrict this test to verifying correct creation and association of
  // entities that a top feed implementation would later consume.
}
