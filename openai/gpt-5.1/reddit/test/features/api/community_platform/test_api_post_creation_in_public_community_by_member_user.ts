import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that an authenticated member user can create a new post in a public
 * community.
 *
 * Business flow:
 *
 * 1. Register a new member user via auth.memberUser.join and obtain the authorized
 *    context.
 * 2. Using the authenticated memberUser, create a new community via
 *    communityPlatform.memberUser.communities.create with visibility configured
 *    as a public-like value and posting allowed for text and link posts.
 * 3. Create a new community post via communityPlatform.memberUser.posts.create
 *    using ICommunityPlatformPost.ICreate, targeting the created community and
 *    providing a valid title plus either text body or link URL (or both) and an
 *    appropriate postType discriminator string.
 * 4. Assert the response is a valid ICommunityPlatformPost and that key relations
 *    and business rules hold:
 *
 *    - Community_id equals the created community.id
 *    - Author_memberuser_id equals the authorized member user id
 *    - Title and body/link_url mirror the submitted values
 *    - Post_type is consistent with the input payload (we only check that it is
 *         non-empty and matches the intended text vs link choice at a coarse
 *         level)
 *    - Status is a non-empty visible-like value
 *    - Is_locked is false
 *    - Created_at and updated_at are present and deleted_at is null or undefined.
 */
export async function test_api_post_creation_in_public_community_by_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // leave ip undefined to let the backend derive it; href/referrer must be valid URIs
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a new public community owned by this member user.
  const communitySlug = `test-${RandomGenerator.alphabets(10)}`;
  const communityBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public", // business-visible public mode string
    status: "active", // initial active status
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // Basic relational sanity checks between community and creator.
  TestValidator.equals(
    "community owner_memberuser_id should equal authorized member id",
    community.owner_memberuser_id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "community visibility should be public",
    community.visibility,
    communityBody.visibility,
  );
  TestValidator.equals(
    "community status should be active",
    community.status,
    communityBody.status,
  );

  // 3. Create a new post in that community as a text+optional-link post.
  // Use both communityId and communityCode (slug) as allowed by ICreate.
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 6,
  });
  const postUrl =
    "https://link.example.com/article/" + RandomGenerator.alphaNumeric(8);

  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: postTitle,
    body: postBody,
    url: postUrl,
    postType: "link", // choose a concrete post type string consistent with having a URL
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Validate core business invariants on the created post.

  // Foreign key to community should match.
  TestValidator.equals(
    "post.community_id should equal created community id",
    post.community_id,
    community.id,
  );

  // Author should be the authenticated member user.
  TestValidator.equals(
    "post.author_memberuser_id should equal authorized member id",
    post.author_memberuser_id,
    authorizedMember.id,
  );

  // Title should match exactly.
  TestValidator.equals(
    "post.title should equal input title",
    post.title,
    postCreateBody.title,
  );

  // Text body should be preserved for text/link posts that include body.
  TestValidator.equals(
    "post.body should equal input body",
    post.body ?? null,
    postCreateBody.body ?? null,
  );

  // Link URL should match the submitted url.
  TestValidator.equals(
    "post.link_url should equal input url",
    post.link_url ?? null,
    (postCreateBody.url as string | null | undefined) ?? null,
  );

  // Post type should be non-empty and, at minimum, reflect the intended link style.
  TestValidator.predicate(
    "post.post_type should be a non-empty string",
    typeof post.post_type === "string" && post.post_type.length > 0,
  );

  // We expect the backend to treat this as a link-like post when a URL is present.
  // We only assert soft consistency that the post_type string contains a hint like
  // "link" or is exactly the requested postType.
  TestValidator.predicate(
    "post_type should either equal requested postType or contain 'link' when URL is set",
    post.post_type === (postCreateBody.postType ?? post.post_type) ||
      post.post_type.toLowerCase().includes("link"),
  );

  // Status should be a non-empty string representing a visible state; we only
  // assert non-emptiness here because the exact vocabulary is domain-specific.
  TestValidator.predicate(
    "post.status should be a non-empty string",
    typeof post.status === "string" && post.status.length > 0,
  );

  // Newly created posts should not be locked by default.
  TestValidator.equals(
    "post.is_locked should be false by default",
    post.is_locked,
    false,
  );

  // created_at and updated_at must be present ISO date-times.
  TestValidator.predicate(
    "post.created_at should look like a date-time string",
    typeof post.created_at === "string" && post.created_at.length > 0,
  );
  TestValidator.predicate(
    "post.updated_at should look like a date-time string",
    typeof post.updated_at === "string" && post.updated_at.length > 0,
  );

  // Newly created posts should not be soft-deleted.
  TestValidator.equals(
    "post.deleted_at should be null or undefined for a fresh post",
    post.deleted_at ?? null,
    null,
  );
}
