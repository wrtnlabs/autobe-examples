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

/**
 * Validate minimal content creation pipeline that would feed into a public hot
 * feed.
 *
 * Business intent (original scenario):
 *
 * - When a new member user joins, creates a community, and posts a single text
 *   post, the public hot feed endpoint GET /communityPlatform/feeds/posts/hot
 *   should be accessible without authentication and should include that post in
 *   its first page of results with correct pagination metadata and post summary
 *   fields.
 *
 * Practical adaptation (given available SDK functions):
 *
 * - This test focuses on the preparatory steps that make a post eligible for a
 *   hot-feed implementation, using only the provided, typed SDK functions.
 * - It verifies:
 *
 *   1. Member user registration and automatic authentication via join.
 *   2. Community creation with text-post-allowed, non-restricted settings.
 *   3. Post creation in that community with a text payload.
 *   4. Consistency between the created entities (author, community, post fields).
 * - The actual GET /communityPlatform/feeds/posts/hot call is not implemented
 *   here because no corresponding SDK accessor is available; we must not
 *   fabricate it.
 */
export async function test_api_hot_feed_public_retrieval_with_single_community_post(
  connection: api.IConnection,
) {
  // 1. Register a new member user via join (creates account + initial session).
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // Verify that token bundle exists and looks structurally correct.
  typia.assert<IAuthorizationToken>(authorized.token);
  TestValidator.predicate(
    "member user username matches requested username",
    authorized.username === joinBody.username,
  );

  // 2. Create a new community with non-restrictive, text-post-allowed settings.
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "created community slug should match input",
    community.slug,
    communityCreateBody.slug,
  );
  TestValidator.equals(
    "created community name should match input",
    community.name,
    communityCreateBody.name,
  );
  TestValidator.predicate(
    "community is configured to allow text posts",
    community.allow_text_posts === true,
  );
  TestValidator.predicate(
    "community is not NSFW, not quarantined, and posting is not restricted",
    community.is_nsfw === false &&
      community.is_quarantined === false &&
      community.is_posting_restricted === false,
  );

  // 3. Create a single text post in that community.
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: postTitle,
    body: postBody,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // Validate core relationships between post, community, and author.
  TestValidator.equals(
    "post community_id should match created community id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author_memberuser_id should match joined member user id",
    post.author_memberuser_id,
    authorized.id,
  );
  TestValidator.equals(
    "post title should match input title",
    post.title,
    postCreateBody.title,
  );
  TestValidator.predicate(
    "post created_at should be a non-empty ISO date-time string",
    post.created_at.length > 0,
  );

  // 4. Logical preconditions for hot-feed eligibility (no actual hot-feed call).
  TestValidator.predicate(
    "post is not locked for interactions",
    post.is_locked === false,
  );
  TestValidator.predicate(
    "post status string is non-empty",
    post.status.length > 0,
  );
}
