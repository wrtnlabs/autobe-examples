import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that post creation respects community-level posting configuration.
 *
 * Business goal: Ensure that when a member user creates posts in different
 * communities, the server enforces each community's allow_text_posts,
 * allow_link_posts, and allow_image_posts flags. Text-only communities should
 * accept text posts and reject link/image-style posts; link-only communities
 * should accept link posts and reject text-only posts; image-only communities
 * should accept image-style posts and reject text/link posts.
 *
 * High-level flow:
 *
 * 1. Register a member user via auth.memberUser.join and rely on automatic token
 *    injection into the connection.
 * 2. Create three communities using
 *    communityPlatform.memberUser.communities.create:
 *
 *    - TextOnlyCommunity: allow_text_posts=true, allow_link_posts=false,
 *         allow_image_posts=false
 *    - LinkOnlyCommunity: allow_text_posts=false, allow_link_posts=true,
 *         allow_image_posts=false
 *    - ImageOnlyCommunity: allow_text_posts=false, allow_link_posts=false,
 *         allow_image_posts=true
 * 3. For each community, attempt post creation with ICommunityPlatformPost.ICreate
 *    via communityPlatform.memberUser.posts.create, using the following
 *    patterns:
 *
 *    - Text-style post: title + body, no url, postType="text"
 *    - Link-style post: title + url, maybe minimal body, postType="link"
 *    - Image-style post: title + image_url, maybe minimal body, postType="image"
 * 4. Assert that:
 *
 *    - In textOnlyCommunity: text posts succeed; link and image posts fail.
 *    - In linkOnlyCommunity: link posts succeed; text and image posts fail.
 *    - In imageOnlyCommunity: image posts succeed; text and link posts fail.
 *
 * Notes and constraints:
 *
 * - Use only the DTOs and SDK functions provided:
 *   ICommunityPlatformMemberuser.IJoin,
 *   ICommunityPlatformMemberuser.IAuthorized,
 *   ICommunityPlatformCommunity.ICreate, ICommunityPlatformCommunity,
 *   ICommunityPlatformPost.ICreate, ICommunityPlatformPost.
 * - For join, construct a valid ICommunityPlatformMemberuser.IJoin request body
 *   using RandomGenerator and typia tags for email/uri where needed.
 * - For communities, construct ICommunityPlatformCommunity.ICreate bodies with
 *   deterministic visibility/status (e.g., "public"/"active") and desired
 *   flags.
 * - For posts, construct ICommunityPlatformPost.ICreate bodies that align with
 *   the intended post type, including a plausible communityCode that matches
 *   the created communities’ slug.
 * - Use typia.assert(...) on successful responses to fully validate structure.
 * - Use TestValidator.equals / predicate to validate key business invariants
 *   (e.g., community_id matches, post_type matches, url presence matches
 *   type).
 * - Use TestValidator.error for disallowed combinations, without checking
 *   concrete HTTP status codes.
 * - Do not create any type-invalid requests (no `as any`, no missing required
 *   fields in DTOs, no deliberate type mismatches).
 */
export async function test_api_post_creation_respects_community_posting_configuration(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain an authorized connection
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://test-client.example.com/signup",
    referrer: "https://test-client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create communities with different posting configurations
  const baseSlug = RandomGenerator.alphaNumeric(10);

  const textCommunityBody = {
    slug: `${baseSlug}-text`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: false,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const linkCommunityBody = {
    slug: `${baseSlug}-link`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: false,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const imageCommunityBody = {
    slug: `${baseSlug}-image`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: false,
    allow_link_posts: false,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const textCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: textCommunityBody },
    );
  typia.assert(textCommunity);

  const linkCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: linkCommunityBody },
    );
  typia.assert(linkCommunity);

  const imageCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: imageCommunityBody },
    );
  typia.assert(imageCommunity);

  // Helper to build a text-style post payload
  const buildTextPost = (community: ICommunityPlatformCommunity) =>
    ({
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.paragraph({ sentences: 5 }),
      postType: "text",
    }) satisfies ICommunityPlatformPost.ICreate;

  // Helper to build a link-style post payload
  const buildLinkPost = (community: ICommunityPlatformCommunity) =>
    ({
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.paragraph({ sentences: 2 }),
      url: "https://example.com/article/" + RandomGenerator.alphaNumeric(8),
      postType: "link",
    }) satisfies ICommunityPlatformPost.ICreate;

  // Helper to build an image-style post payload
  const buildImagePost = (community: ICommunityPlatformCommunity) =>
    ({
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.paragraph({ sentences: 2 }),
      // Treat this as an image URL; schema uses tags.Format<"uri">
      url:
        "https://cdn.example.com/images/" +
        RandomGenerator.alphaNumeric(12) +
        ".jpg",
      postType: "image",
    }) satisfies ICommunityPlatformPost.ICreate;

  // 3. Text-only community behavior
  // 3.1 Allowed: text post
  {
    const textPostBody = buildTextPost(textCommunity);
    const textPost: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: textPostBody },
      );
    typia.assert(textPost);

    TestValidator.equals(
      "text community id matches post.community_id for text post",
      textPost.community_id,
      textCommunity.id,
    );
    TestValidator.equals(
      "text post_type stored as 'text'",
      textPost.post_type,
      textPostBody.postType,
    );
    TestValidator.predicate(
      "text post has body and no link_url",
      textPost.body !== null &&
        textPost.body !== undefined &&
        (textPost.link_url === null || textPost.link_url === undefined),
    );
  }

  // 3.2 Disallowed: link post in text-only community
  await TestValidator.error(
    "link post should be rejected in text-only community",
    async () => {
      const linkPostBody = buildLinkPost(textCommunity);
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: linkPostBody },
      );
    },
  );

  // 3.3 Disallowed: image post in text-only community
  await TestValidator.error(
    "image post should be rejected in text-only community",
    async () => {
      const imagePostBody = buildImagePost(textCommunity);
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: imagePostBody },
      );
    },
  );

  // 4. Link-only community behavior
  // 4.1 Allowed: link post
  {
    const linkPostBody = buildLinkPost(linkCommunity);
    const linkPost: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: linkPostBody },
      );
    typia.assert(linkPost);

    TestValidator.equals(
      "link community id matches post.community_id",
      linkPost.community_id,
      linkCommunity.id,
    );
    TestValidator.equals(
      "link post_type stored as 'link'",
      linkPost.post_type,
      linkPostBody.postType,
    );
    TestValidator.predicate(
      "link post has link_url and may have body",
      linkPost.link_url !== null && linkPost.link_url !== undefined,
    );
  }

  // 4.2 Disallowed: text post in link-only community
  await TestValidator.error(
    "text post should be rejected in link-only community",
    async () => {
      const textPostBody = buildTextPost(linkCommunity);
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: textPostBody },
      );
    },
  );

  // 4.3 Disallowed: image post in link-only community
  await TestValidator.error(
    "image post should be rejected in link-only community",
    async () => {
      const imagePostBody = buildImagePost(linkCommunity);
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: imagePostBody },
      );
    },
  );

  // 5. Image-only community behavior
  // Since ICommunityPlatformPost.ICreate does not expose image_url, we treat
  // an image-style post as one with postType="image" and a URL pointing to
  // an image CDN. Business rules are assumed to infer image-vs-link from
  // postType and/or URL pattern.

  // 5.1 Allowed: image-style post
  {
    const imagePostBody = buildImagePost(imageCommunity);
    const imagePost: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: imagePostBody },
      );
    typia.assert(imagePost);

    TestValidator.equals(
      "image community id matches post.community_id",
      imagePost.community_id,
      imageCommunity.id,
    );
    TestValidator.equals(
      "image post_type stored as 'image'",
      imagePost.post_type,
      imagePostBody.postType,
    );
    TestValidator.predicate(
      "image post has link_url populated",
      imagePost.link_url !== null && imagePost.link_url !== undefined,
    );
  }

  // 5.2 Disallowed: text post in image-only community
  await TestValidator.error(
    "text post should be rejected in image-only community",
    async () => {
      const textPostBody = buildTextPost(imageCommunity);
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: textPostBody },
      );
    },
  );

  // 5.3 Disallowed: link post in image-only community
  await TestValidator.error(
    "link post should be rejected in image-only community",
    async () => {
      const linkPostBody = buildLinkPost(imageCommunity);
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: linkPostBody },
      );
    },
  );
}
