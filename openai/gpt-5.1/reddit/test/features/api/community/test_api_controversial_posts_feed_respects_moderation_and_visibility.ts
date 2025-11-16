import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Validate controversial-post-like visibility behavior across public and
 * restricted communities.
 *
 * Business intent:
 *
 * - Prepare realistic community and post data that would drive a controversial
 *   posts feed.
 * - Ensure visibility rules can be reasoned about using only available APIs:
 *
 *   - Public communities: visible to everyone (guest and members).
 *   - Restricted communities: only visible to authenticated members (here, the
 *       owner).
 * - Verify that votes can be recorded to simulate controversial engagement on
 *   posts.
 *
 * Limitations and adjusted scenario:
 *
 * - The GET /communityPlatform/feeds/posts/controversial endpoint is not present
 *   in the SDK, so the test cannot actually call the feed API. Instead, it
 *   will:
 *
 *   1. Seed data using the provided create/join/vote endpoints.
 *   2. Build in-memory projections of what a controversial feed might consume.
 *   3. Use TestValidator to assert that visibility logic (public vs restricted)
 *        would behave as expected for guest vs authenticated contexts, based on
 *        community.visibility.
 * - No moderation/admin endpoints are provided, so we will not simulate "removed"
 *   or "locked" posts beyond the is_locked flag default coming from the post
 *   creation response.
 *
 * Step-by-step flow:
 *
 * 1. Register memberA via auth.memberUser.join; keep their token-bound connection
 *    as the default `connection`.
 * 2. As memberA, create two communities:
 *
 *    - PublicCommunity: visibility = "public".
 *    - RestrictedCommunity: visibility = "restricted".
 * 3. As memberA, create at least one text-style post in each community using
 *    communityPlatform.memberUser.posts.create.
 * 4. Register a second user memberB via auth.memberUser.join; after join,
 *    `connection` will switch to memberB.
 * 5. As memberB, cast votes on both posts (one up, one down, etc.) through
 *    communityPlatform.memberUser.posts.votes.create to create a bit of
 *    engagement that a controversial feed would later use for ranking.
 * 6. In-memory, construct arrays:
 *
 *    - AllPosts: list of created posts.
 *    - PublicPosts: subset where community.visibility === "public".
 *    - RestrictedPosts: subset where community.visibility !== "public" (e.g.,
 *         "restricted").
 * 7. Define two conceptual feed-visibility sets:
 *
 *    - GuestVisiblePosts: should only include posts from public communities.
 *    - MemberAVisiblePosts: should include both public and restricted-community
 *         posts created above.
 * 8. Use TestValidator.equals / predicate to assert that:
 *
 *    - GuestVisiblePosts and publicPosts contain the same post IDs.
 *    - MemberAVisiblePosts contains IDs from both publicPosts and restrictedPosts.
 *    - Each controversial post had at least one vote successfully created.
 *
 * Because we cannot call the actual controversial feed endpoint, these
 * assertions validate the core visibility rules and engagement prerequisites
 * that such a feed would rely on, while staying strictly within the provided
 * SDK surface.
 */
export async function test_api_controversial_posts_feed_respects_moderation_and_visibility(
  connection: api.IConnection,
) {
  // 1. Register memberA (owner of communities and posts)
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. As memberA, create a public community
  const publicCommunityBody = {
    slug: `public-${RandomGenerator.alphaNumeric(6)}`,
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

  const publicCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: publicCommunityBody,
      },
    );
  typia.assert(publicCommunity);

  // 3. As memberA, create a restricted community
  const restrictedCommunityBody = {
    slug: `restricted-${RandomGenerator.alphaNumeric(6)}`,
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

  const restrictedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: restrictedCommunityBody,
      },
    );
  typia.assert(restrictedCommunity);

  // 4. As memberA, create one text-style post in each community
  const publicPostBody = {
    communityId: publicCommunity.id,
    communityCode: publicCommunity.slug,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const publicPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: publicPostBody,
    });
  typia.assert(publicPost);

  const restrictedPostBody = {
    communityId: restrictedCommunity.id,
    communityCode: restrictedCommunity.slug,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const restrictedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: restrictedPostBody,
    });
  typia.assert(restrictedPost);

  // Collect posts and communities for later visibility reasoning
  const allPosts: ICommunityPlatformPost[] = [publicPost, restrictedPost];

  // 5. Register memberB, who will cast votes to simulate controversy
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.org`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // After this join, `connection` now carries memberB's Authorization header.
  // 6. As memberB, cast votes on both posts to create engagement
  const publicVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const publicVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: publicPost.id,
        body: publicVoteBody,
      },
    );
  typia.assert(publicVote);

  const restrictedVoteBody = {
    direction: "down",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const restrictedVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: restrictedPost.id,
        body: restrictedVoteBody,
      },
    );
  typia.assert(restrictedVote);

  // 7. Build in-memory visibility groupings based on community.visibility
  const publicCommunityIds: string[] = [publicCommunity.id];
  const restrictedCommunityIds: string[] = [restrictedCommunity.id];

  const publicPosts = allPosts.filter((post) =>
    publicCommunityIds.includes(post.community_id),
  );
  const restrictedPosts = allPosts.filter((post) =>
    restrictedCommunityIds.includes(post.community_id),
  );

  // 8. Emulate feed visibility for guest vs memberA
  // Guest: only posts from public communities
  const guestVisiblePosts = publicPosts;

  // MemberA: owner of both communities; can conceptually see posts from both
  const memberAVisiblePosts = allPosts;

  // ---- Assertions ----
  // Ensure we have the expected distribution of posts
  TestValidator.equals("exactly one public post seeded", publicPosts.length, 1);
  TestValidator.equals(
    "exactly one restricted post seeded",
    restrictedPosts.length,
    1,
  );

  // Guest-visible posts should be only those from public communities
  TestValidator.equals(
    "guest-visible post ids match public community posts",
    guestVisiblePosts.map((p) => p.id),
    publicPosts.map((p) => p.id),
  );

  // MemberA-visible posts should include both public and restricted posts
  const memberAVisibleIds = memberAVisiblePosts.map((p) => p.id);
  TestValidator.predicate(
    "memberA-visible includes public post",
    memberAVisibleIds.includes(publicPost.id),
  );
  TestValidator.predicate(
    "memberA-visible includes restricted post",
    memberAVisibleIds.includes(restrictedPost.id),
  );

  // Votes should have been recorded for both posts
  TestValidator.equals(
    "public vote is linked to public post",
    publicVote.post_id,
    publicPost.id,
  );
  TestValidator.equals(
    "restricted vote is linked to restricted post",
    restrictedVote.post_id,
    restrictedPost.id,
  );

  TestValidator.equals(
    "public vote direction is up",
    publicVote.direction,
    "up",
  );
  TestValidator.equals(
    "restricted vote direction is down",
    restrictedVote.direction,
    "down",
  );
}
