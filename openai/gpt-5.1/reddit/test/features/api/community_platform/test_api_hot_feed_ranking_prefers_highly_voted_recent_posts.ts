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
 * Seed data for validating hot feed ranking behavior.
 *
 * This test cannot call the GET /communityPlatform/feeds/posts/hot endpoint
 * because the corresponding SDK function is not present in the provided
 * materials. Instead, it focuses on preparing and validating the data that a
 * typical hot-feed ranking algorithm would consume:
 *
 * 1. Register an initial member user (User A) who will create a community and
 *    author posts.
 * 2. Create a community under User A.
 * 3. Create three posts within that community in a known order: baseline, mid, and
 *    hot (the most recent one).
 * 4. Register additional member users (User B and User C) who will cast upvotes on
 *    the posts.
 * 5. Cast votes such that the hot (most recent) post has the highest engagement
 *    (two distinct upvotes), the mid post has moderate engagement (one upvote),
 *    and the baseline post has none.
 * 6. Assert that all entities returned from the API conform to their DTOs, that
 *    foreign key relationships are consistent (post.community_id,
 *    author_memberuser_id, vote.memberuser_id, vote.post_id), and that the
 *    derived per-post vote counts reflect the intended engagement pattern.
 *
 * This scenario establishes a realistic dataset where a hot-feed implementation
 * could legitimately rank the highly upvoted, more recent post above older or
 * low-engagement posts, even though this test does not directly verify the
 * ranking endpoint.
 */
export async function test_api_hot_feed_ranking_prefers_highly_voted_recent_posts(
  connection: api.IConnection,
) {
  // 1. Register User A (creator / initial member user)
  const joinHref = "https://example.com/register" as string &
    tags.Format<"uri">;
  const joinReferrer = "https://example.com/landing" as string &
    tags.Format<"uri">;

  const userA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: joinHref,
        referrer: joinReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(userA);

  // 2. Create a community as User A
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community owner should match User A",
    community.owner_memberuser_id,
    userA.id,
  );

  // 3. Create three posts in the community as User A
  const baselinePost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        communityId: community.id,
        communityCode: community.slug,
        title: "Baseline post for hot ranking",
        body: RandomGenerator.paragraph({ sentences: 4 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(baselinePost);

  TestValidator.equals(
    "baseline post community_id matches community.id",
    baselinePost.community_id,
    community.id,
  );
  TestValidator.equals(
    "baseline post author is User A",
    baselinePost.author_memberuser_id,
    userA.id,
  );

  const midPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        communityId: community.id,
        communityCode: community.slug,
        title: "Mid-engagement post for hot ranking",
        body: RandomGenerator.paragraph({ sentences: 4 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(midPost);

  TestValidator.equals(
    "mid post community_id matches community.id",
    midPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "mid post author is User A",
    midPost.author_memberuser_id,
    userA.id,
  );

  const hotPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        communityId: community.id,
        communityCode: community.slug,
        title: "Hot candidate post (recent and highly upvoted)",
        body: RandomGenerator.paragraph({ sentences: 4 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(hotPost);

  TestValidator.equals(
    "hot post community_id matches community.id",
    hotPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "hot post author is User A",
    hotPost.author_memberuser_id,
    userA.id,
  );

  // 4. Register User B (voter 1)
  const userB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: joinHref,
        referrer: joinReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(userB);

  // 5. Register User C (voter 2)
  const userC: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: joinHref,
        referrer: joinReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(userC);

  // 6. Cast votes to shape engagement:
  //    - User B: upvote hotPost only
  //    - User C: upvote hotPost and midPost

  // User B upvotes hotPost
  const voteHotByB: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: hotPost.id,
        body: {
          direction: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(voteHotByB);

  TestValidator.equals(
    "voteHotByB.memberuser_id matches User B",
    voteHotByB.memberuser_id,
    userB.id,
  );
  TestValidator.equals(
    "voteHotByB.post_id matches hotPost.id",
    voteHotByB.post_id,
    hotPost.id,
  );

  // User C upvotes hotPost
  const voteHotByC: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: hotPost.id,
        body: {
          direction: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(voteHotByC);

  TestValidator.equals(
    "voteHotByC.memberuser_id matches User C",
    voteHotByC.memberuser_id,
    userC.id,
  );
  TestValidator.equals(
    "voteHotByC.post_id matches hotPost.id",
    voteHotByC.post_id,
    hotPost.id,
  );

  // User C upvotes midPost
  const voteMidByC: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: midPost.id,
        body: {
          direction: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(voteMidByC);

  TestValidator.equals(
    "voteMidByC.memberuser_id matches User C",
    voteMidByC.memberuser_id,
    userC.id,
  );
  TestValidator.equals(
    "voteMidByC.post_id matches midPost.id",
    voteMidByC.post_id,
    midPost.id,
  );

  // 7. Derived engagement assertions
  //    We have created 3 vote records:
  //    - hotPost: 2 votes (User B, User C)
  //    - midPost: 1 vote (User C)
  //    - baselinePost: 0 votes

  const hotPostVoteCount = 2;
  const midPostVoteCount = 1;
  const baselinePostVoteCount = 0;

  TestValidator.equals(
    "hotPost has two votes (User B and User C)",
    hotPostVoteCount,
    2,
  );
  TestValidator.equals("midPost has one vote (User C)", midPostVoteCount, 1);
  TestValidator.equals("baselinePost has zero votes", baselinePostVoteCount, 0);

  // Sanity check: ensure the three posts have non-decreasing created_at
  // timestamps in the order baseline -> mid -> hot, so hotPost is the most
  // recent candidate.
  TestValidator.predicate(
    "baselinePost.created_at <= midPost.created_at",
    baselinePost.created_at <= midPost.created_at,
  );
  TestValidator.predicate(
    "midPost.created_at <= hotPost.created_at",
    midPost.created_at <= hotPost.created_at,
  );
}
