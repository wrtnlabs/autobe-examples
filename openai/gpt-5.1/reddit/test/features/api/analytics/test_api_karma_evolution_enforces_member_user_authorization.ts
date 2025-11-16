import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformKarmaEvolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaEvolution";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaEvolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaEvolution";

export async function test_api_karma_evolution_enforces_member_user_authorization(
  connection: api.IConnection,
) {
  /** 1. Register user A (author under analysis) and capture a dedicated connection. */
  const userAJoinInput = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}+a@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const baseConn: api.IConnection = connection;

  const userA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(baseConn, {
      body: userAJoinInput,
    });
  typia.assert(userA);

  // After join, baseConn.headers.Authorization now holds user A token.
  const connA: api.IConnection = { ...baseConn };

  /** 2. As user A, create a community. */
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connA,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  /** 3. As user A, create membership in that community. */
  const membershipCreateBodyA = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connA,
      {
        communitySlug: community.slug,
        body: membershipCreateBodyA,
      },
    );
  typia.assert(membershipA);

  /** 4. As user A, create a post in the community. */
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connA, {
      body: postCreateBody,
    });
  typia.assert(post);

  /** 5. As user A, create a comment on that post. */
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connA,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  /** Capture time window that covers all subsequent karma events. */
  const from: string & tags.Format<"date-time"> = new Date(
    Date.now() - 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  /**
   * 6. Register one voter member user and join same community, using its own
   *    connection.
   */
  const voterJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}+voter@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const voter: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(baseConn, {
      body: voterJoinBody,
    });
  typia.assert(voter);

  const connVoter: api.IConnection = { ...baseConn };

  const membershipCreateBodyVoter = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipVoter: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connVoter,
      {
        communitySlug: community.slug,
        body: membershipCreateBodyVoter,
      },
    );
  typia.assert(membershipVoter);

  /** 7. As voter, cast an upvote on post and comment to generate karma for user A. */
  const postVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connVoter,
      {
        postId: post.id,
        body: postVoteCreateBody,
      },
    );
  typia.assert(postVote);

  const commentVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connVoter,
      {
        commentId: comment.id,
        body: commentVoteCreateBody,
      },
    );
  typia.assert(commentVote);

  /** Ending time window slightly in the future to cover all events. */
  const to: string & tags.Format<"date-time"> = new Date(
    Date.now() + 5 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  /** Common request body for karma evolution queries scoped to the community. */
  const karmaRequestBody = {
    from,
    to,
    bucket_granularity: "daily",
    community_id: community.id,
    content_scope: "all",
    page: 0,
    limit: 50,
  } satisfies ICommunityPlatformKarmaEvolution.IRequest;

  /**
   * 8. Attempt to call karma evolution WITHOUT authentication. Use a fresh
   *    connection with empty headers so that no Authorization is sent.
   */
  const unauthConn: api.IConnection = { ...baseConn, headers: {} };

  await TestValidator.error(
    "unauthenticated karma evolution access should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.analytics.karma.evolution.index(
        unauthConn,
        {
          body: karmaRequestBody,
        },
      );
    },
  );

  /** 9. Register user B and call karma evolution under user B's session. */
  const userBJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}+b@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const userB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(baseConn, {
      body: userBJoinBody,
    });
  typia.assert(userB);

  const connB: api.IConnection = { ...baseConn };

  const userBPage: IPageICommunityPlatformKarmaEvolution.ISummary =
    await api.functional.communityPlatform.memberUser.analytics.karma.evolution.index(
      connB,
      {
        body: karmaRequestBody,
      },
    );
  typia.assert(userBPage);

  // All summaries must be about user B, if any exist.
  for (const summary of userBPage.data) {
    TestValidator.equals(
      "karma evolution for user B must reference user B",
      summary.member_user.id,
      userB.id,
    );
  }

  /** 10. As user A, call karma evolution using connA and verify identity binding. */
  const userAPage: IPageICommunityPlatformKarmaEvolution.ISummary =
    await api.functional.communityPlatform.memberUser.analytics.karma.evolution.index(
      connA,
      {
        body: karmaRequestBody,
      },
    );
  typia.assert(userAPage);

  for (const summary of userAPage.data) {
    TestValidator.equals(
      "karma evolution summaries for user A must reference user A",
      summary.member_user.id,
      userA.id,
    );
  }
}
