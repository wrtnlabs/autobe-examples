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

export async function test_api_posts_list_top_and_new_sorting(
  connection: api.IConnection,
) {
  /**
   * Verify community posts listing sorted by 'top' (ranking with votes) and
   * 'new' (newest first) for unauthenticated visitors.
   *
   * Workflow:
   *
   * 1. Create alice (author) and bob (voter) accounts via join
   * 2. Alice creates a community with a unique slug
   * 3. Alice uploads a media asset
   * 4. Alice creates three posts: A (text), B (link), C (text with media)
   * 5. Bob upvotes posts to affect ranking (idempotency check)
   * 6. Unauthenticated visitor lists posts with sort='top' and verifies ordering
   *    and aggregates
   * 7. Repeat with sort='new' and verify newest-first ordering
   */

  // 1) Prepare isolated connections for each actor
  const aliceConn: api.IConnection = { ...connection, headers: {} };
  const bobConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create alice (author)
  const aliceEmail = typia.random<string & tags.Format<"email">>();
  const aliceUsername = `${RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase()}_${Date.now()}`;
  const aliceAuth = await api.functional.auth.communityMember.join(aliceConn, {
    body: {
      email: aliceEmail,
      username: aliceUsername,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(),
      session_context: {
        href: connection.host ?? "http://example.local/",
        referrer: connection.host ?? "http://example.local/",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(aliceAuth);

  // 3) Create bob (voter)
  const bobEmail = typia.random<string & tags.Format<"email">>();
  const bobUsername = `${RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase()}_${Date.now()}b`;
  const bobAuth = await api.functional.auth.communityMember.join(bobConn, {
    body: {
      email: bobEmail,
      username: bobUsername,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(),
      session_context: {
        href: connection.host ?? "http://example.local/",
        referrer: connection.host ?? "http://example.local/",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(bobAuth);

  // 4) Alice creates a unique community
  const uniqueSlug = `test-community-${Date.now()}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      aliceConn,
      {
        body: {
          name: `Test Community ${Date.now()}`,
          slug: uniqueSlug,
          description: "E2E test community for post sorting",
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches",
    community.slug,
    uniqueSlug,
  );

  // 5) Alice uploads a media asset (url mode)
  const upload =
    await api.functional.communityBbs.communityMember.uploads.create(
      aliceConn,
      {
        body: {
          upload_mode: "url",
          url: typia.random<string & tags.Format<"uri">>(),
          media_type: "image/png",
          size_bytes: 12345,
          ordering: 0,
          community_bbs_post_id: null,
        } satisfies ICommunityBbsPostMedia.ICreate,
      },
    );
  typia.assert(upload);

  // 6) Alice creates three posts: A (text), B (link), C (text with media)
  const postA =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      aliceConn,
      {
        communitySlug: community.slug,
        body: {
          title: "Post A - Text",
          body: RandomGenerator.paragraph({ sentences: 8 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(postA);

  const postB =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      aliceConn,
      {
        communitySlug: community.slug,
        body: {
          title: "Post B - Link",
          post_type: "link",
          link_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(postB);

  const postC =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      aliceConn,
      {
        communitySlug: community.slug,
        body: {
          title: "Post C - Media",
          body: RandomGenerator.paragraph({ sentences: 6 }),
          post_type: "image",
          media_ids: [upload.id],
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(postC);

  // Basic invariants
  TestValidator.equals(
    "post A author matches community creator",
    postA.author.id,
    community.creator.id,
  );
  TestValidator.equals(
    "post B community matches created community",
    postB.community.id,
    community.id,
  );

  // 7) Bob votes: upvote Post C (idempotency) then upvote Post A
  const voteC1 =
    await api.functional.communityBbs.communityMember.posts.votes.create(
      bobConn,
      {
        postId: postC.id,
        body: {
          value: 1,
        } satisfies ICommunityBbsPostVote.ICreate,
      },
    );
  typia.assert(voteC1);

  // Idempotency: repeat same vote (should not create duplicate or change semantics)
  const voteC2 =
    await api.functional.communityBbs.communityMember.posts.votes.create(
      bobConn,
      {
        postId: postC.id,
        body: {
          value: 1,
        } satisfies ICommunityBbsPostVote.ICreate,
      },
    );
  typia.assert(voteC2);

  // Bob upvotes Post A as well
  const voteA =
    await api.functional.communityBbs.communityMember.posts.votes.create(
      bobConn,
      {
        postId: postA.id,
        body: {
          value: 1,
        } satisfies ICommunityBbsPostVote.ICreate,
      },
    );
  typia.assert(voteA);

  // 8) Unauthenticated visitor lists posts with sort='top'
  const topRequestLimit = 10;
  const topPage = await api.functional.communityBbs.communities.posts.index(
    unauthConn,
    {
      communitySlug: community.slug,
      body: {
        sort: "top",
        time_window: "all",
        limit: topRequestLimit,
      } satisfies ICommunityBbsPost.IRequest,
    },
  );
  typia.assert(topPage);

  // Pagination metadata checks
  TestValidator.predicate(
    "pagination present in top listing",
    topPage.pagination !== null && typeof topPage.pagination.limit === "number",
  );
  TestValidator.equals(
    "top listing limit matches request",
    topPage.pagination.limit,
    topRequestLimit,
  );

  // Ensure returned items are published summaries and include aggregates
  TestValidator.predicate(
    "top listing contains only published items",
    topPage.data.every((d) => d.is_published === true),
  );

  // Find indices of Post C and Post A in top results
  const idsTop = topPage.data.map((d) => d.id);
  const idxC = idsTop.indexOf(postC.id);
  const idxA = idsTop.indexOf(postA.id);

  TestValidator.predicate("post C appears in top listing", idxC >= 0);
  TestValidator.predicate("post A appears in top listing", idxA >= 0);

  // Business rule: Post C (more votes) should rank above Post A
  TestValidator.predicate(
    "post C ranks above post A in top sorting",
    idxC < idxA,
  );

  // Check aggregates exist on summaries
  TestValidator.predicate(
    "top summaries include aggregates",
    topPage.data.every(
      (d) =>
        typeof d.score === "number" &&
        typeof d.upvotes === "number" &&
        typeof d.downvotes === "number" &&
        typeof d.comment_count === "number",
    ),
  );

  // 9) Repeat listing with sort='new' and verify newest-first ordering
  const newRequestLimit = 10;
  const newPage = await api.functional.communityBbs.communities.posts.index(
    unauthConn,
    {
      communitySlug: community.slug,
      body: {
        sort: "new",
        limit: newRequestLimit,
      } satisfies ICommunityBbsPost.IRequest,
    },
  );
  typia.assert(newPage);

  TestValidator.predicate(
    "pagination present in new listing",
    newPage.pagination !== null && typeof newPage.pagination.limit === "number",
  );
  TestValidator.equals(
    "new listing limit matches request",
    newPage.pagination.limit,
    newRequestLimit,
  );

  // Verify ordering by published_at (newest first)
  const dates = newPage.data
    .map((d) => d.published_at ?? d.created_at)
    .map((s) => new Date(s).getTime());
  const isNonIncreasing = dates.every((t, i) => i === 0 || t <= dates[i - 1]);
  TestValidator.predicate(
    "new listing is ordered newest-first",
    isNonIncreasing,
  );

  // Final business invariants
  TestValidator.predicate(
    "author projection is present for every summary",
    newPage.data.every(
      (d) => !!d.author && typeof d.author.username === "string",
    ),
  );
}
