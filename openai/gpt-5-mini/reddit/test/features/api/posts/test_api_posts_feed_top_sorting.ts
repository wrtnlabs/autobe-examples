import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostVote";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";

/**
 * Validate the "top" feed ordering and time-window behavior for community
 * posts.
 *
 * Business purpose:
 *
 * - Ensure that when requesting the posts feed with sort='top' and a time window
 *   (last week), the API returns posts ordered by cached score (highest first)
 *   and includes necessary pagination metadata and cached aggregates.
 *
 * Test steps:
 *
 * 1. Create three community members (alice, bob, charlie) via
 *    /auth/communityMember/join.
 * 2. As alice: create a unique community.
 * 3. As alice: create three posts in that community (A, B, C).
 * 4. As bob and charlie: cast votes so that A has 2 upvotes, B has 1 upvote, C has
 *    0.
 * 5. Call PATCH /communityBbs/posts with sort='top' and time_window='week'
 *    filtered by community slug.
 * 6. Assert returned order is [A, B, C], pagination metadata present, and each
 *    summary contains expected aggregates and author projection. Ensure all
 *    returned posts are published.
 */
export async function test_api_posts_feed_top_sorting(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connections for each test actor (do not mutate original headers)
  const aliceConn: api.IConnection = { ...connection, headers: {} };
  const bobConn: api.IConnection = { ...connection, headers: {} };
  const charlieConn: api.IConnection = { ...connection, headers: {} };

  // Helpful generator data
  const password = "Passw0rd!"; // satisfies password policy
  const baseHref = "http://localhost/test";

  // 2. Register alice
  const aliceAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(aliceConn, {
      body: {
        email: `alice.${Date.now()}@example.test`,
        username: `alice_${RandomGenerator.alphaNumeric(6)}`,
        password,
        display_name: "Alice Tester",
        session_context: {
          href: baseHref,
          referrer: baseHref,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(aliceAuth);

  // 3. Register bob
  const bobAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(bobConn, {
      body: {
        email: `bob.${Date.now()}@example.test`,
        username: `bob_${RandomGenerator.alphaNumeric(6)}`,
        password,
        display_name: "Bob Voter",
        session_context: {
          href: baseHref,
          referrer: baseHref,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(bobAuth);

  // 4. Register charlie (additional voter to allow multiple upvotes)
  const charlieAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(charlieConn, {
      body: {
        email: `charlie.${Date.now()}@example.test`,
        username: `charlie_${RandomGenerator.alphaNumeric(6)}`,
        password,
        display_name: "Charlie Voter",
        session_context: {
          href: baseHref,
          referrer: baseHref,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(charlieAuth);

  // 5. As alice: create a community
  const uniqueSuffix = `${Date.now()}${RandomGenerator.alphaNumeric(3)}`;
  const communityName = `test-community-${uniqueSuffix}`;
  const communitySlug = communityName.toLowerCase();

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      aliceConn,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: "E2E test community for top feed sorting",
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. As alice: create three posts (A, B, C)
  const postA: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      aliceConn,
      {
        communitySlug: community.slug,
        body: {
          title: `Post A - ${RandomGenerator.paragraph({ sentences: 3 })}`,
          body: RandomGenerator.content({ paragraphs: 2 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(postA);

  const postB: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      aliceConn,
      {
        communitySlug: community.slug,
        body: {
          title: `Post B - ${RandomGenerator.paragraph({ sentences: 3 })}`,
          body: RandomGenerator.content({ paragraphs: 1 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(postB);

  const postC: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      aliceConn,
      {
        communitySlug: community.slug,
        body: {
          title: `Post C - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          body: RandomGenerator.content({ paragraphs: 1 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(postC);

  // 7. As bob and charlie: cast votes to produce distribution: A:2, B:1, C:0
  // bob upvotes postA
  const vote1: ICommunityBbsPostVote =
    await api.functional.communityBbs.communityMember.posts.votes.create(
      bobConn,
      {
        postId: postA.id,
        body: { value: 1 } satisfies ICommunityBbsPostVote.ICreate,
      },
    );
  typia.assert(vote1);

  // charlie upvotes postA
  const vote2: ICommunityBbsPostVote =
    await api.functional.communityBbs.communityMember.posts.votes.create(
      charlieConn,
      {
        postId: postA.id,
        body: { value: 1 } satisfies ICommunityBbsPostVote.ICreate,
      },
    );
  typia.assert(vote2);

  // bob upvotes postB
  const vote3: ICommunityBbsPostVote =
    await api.functional.communityBbs.communityMember.posts.votes.create(
      bobConn,
      {
        postId: postB.id,
        body: { value: 1 } satisfies ICommunityBbsPostVote.ICreate,
      },
    );
  typia.assert(vote3);

  // 8. Query posts feed with sort=top and time_window=week filtered to the created community
  const page: IPageICommunityBbsPost.ISummary =
    await api.functional.communityBbs.posts.index(connection, {
      body: {
        sort: "top",
        time_window: "week",
        community_slug: community.slug,
        limit: 10,
      } satisfies ICommunityBbsPost.IRequest,
    });
  typia.assert(page);

  // 9. Business assertions
  // Expected order by upvotes: postA (2), postB (1), postC (0)
  const expectedOrder = [postA.id, postB.id, postC.id];
  const actualOrder = page.data.map((d) => d.id);
  TestValidator.equals(
    "top-sorted post ids (expected highest score first)",
    actualOrder,
    expectedOrder,
  );

  // Validate per-item aggregates and publication state
  const expectedUpvotesMap: Record<string, number> = {
    [postA.id]: 2,
    [postB.id]: 1,
    [postC.id]: 0,
  };

  for (const item of page.data) {
    // upvotes should match expected distribution
    TestValidator.equals(
      `upvotes for ${item.id} should match expected`,
      item.upvotes,
      expectedUpvotesMap[item.id] ?? 0,
    );

    // Feed must exclude unpublished/soft-deleted posts: ensure published
    TestValidator.equals(
      `post ${item.id} is published`,
      item.is_published,
      true,
    );

    // Each summary MUST include author projection (typia.assert already validated shape)
    TestValidator.predicate(
      `summary ${item.id} has author id`,
      typeof item.author?.id === "string" && item.author.id.length > 0,
    );
  }

  // 10. Pagination metadata validation
  TestValidator.predicate("pagination present", !!page.pagination);
  TestValidator.predicate(
    "pagination.records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    page.pagination.limit > 0,
  );

  // Compute hasNext using pagination fields and assert
  const hasNext = page.pagination.current < page.pagination.pages;
  TestValidator.predicate(
    "hasNext computed from pagination",
    typeof hasNext === "boolean",
  );
}
