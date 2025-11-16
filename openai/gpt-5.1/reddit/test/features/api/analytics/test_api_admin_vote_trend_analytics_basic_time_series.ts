import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformVoteTrendAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteTrendAnalytics";

export async function test_api_admin_vote_trend_analytics_basic_time_series(
  connection: api.IConnection,
) {
  // 1. Register an admin user (adminUser.join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPW123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminIdentifier = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 2. Register a member user (memberUser.join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.test.com`,
    password: "MemberPW123!" as string & tags.MinLength<8>,
    ip: null,
    href: "https://client.test/join" as string & tags.Format<"uri">,
    referrer: "https://client.test/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberIdentifier = memberAuthorized.email;
  const memberPassword = memberJoinBody.password;

  // 3. Login as member user (ensure memberUser actor)
  const memberLoginBody = {
    identifier: memberIdentifier,
    password: memberPassword,
    ip: null,
    href: "https://client.test/login" as string & tags.Format<"uri">,
    referrer: "https://client.test/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. Create a community as memberUser
  const communitySlug = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.name(2) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) as
      | (string & tags.MaxLength<4000>)
      | null
      | undefined,
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
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Create membership in the community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 6. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Create a comment on that post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 8. Establish time window around now
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const fromIso = fromDate.toISOString() as string & tags.Format<"date-time">;
  const toIso = toDate.toISOString() as string & tags.Format<"date-time">;

  // 9. Cast several votes on the post and comment as memberUser
  const postUpVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: { direction: "up" } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(postUpVote);

  const postDownVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          direction: "down",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(postDownVote);

  const postUpVoteAgain: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: { direction: "up" } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(postUpVoteAgain);

  const commentUpVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          direction: "up",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(commentUpVote);

  const commentDownVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          direction: "down",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(commentDownVote);

  // 10. Switch to adminUser via login
  const adminLoginBody = {
    identifier: adminIdentifier,
    password: adminPassword,
    ip: null,
    href: "https://admin.test/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 11. Build analytics request body (granularity day, includeKarma false)
  const analyticsRequestBody = {
    from: fromIso,
    to: toIso,
    granularity: "day" as const,
    communityIds: [community.id],
    memberUserIds: undefined,
    contentTypes: undefined,
    includeKarma: false,
    maxBuckets: undefined,
  } satisfies ICommunityPlatformVoteTrendAnalytics.IRequest;

  // 12. Call analytics endpoint
  const analytics: ICommunityPlatformVoteTrendAnalytics =
    await api.functional.communityPlatform.adminUser.analytics.votes.trends.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert(analytics);

  // 13. Structural and business assertions
  // timeRange within [from, to]
  TestValidator.predicate(
    "analytics.timeRange.from should be >= requested from",
    new Date(analytics.timeRange.from).getTime() >=
      new Date(analyticsRequestBody.from).getTime(),
  );
  TestValidator.predicate(
    "analytics.timeRange.to should be <= requested to",
    new Date(analytics.timeRange.to).getTime() <=
      new Date(analyticsRequestBody.to).getTime(),
  );

  // granularity check
  TestValidator.equals(
    "analytics granularity should be 'day'",
    analytics.granularity,
    "day",
  );

  // at least one series
  TestValidator.predicate(
    "analytics should contain at least one series",
    analytics.series.length >= 1,
  );

  // At least one series has at least one bucket
  const hasSeriesWithBuckets = analytics.series.some(
    (s) => s.buckets.length >= 1,
  );
  TestValidator.predicate(
    "at least one series should have at least one bucket",
    hasSeriesWithBuckets,
  );

  // Validate each series and bucket
  for (const s of analytics.series) {
    // Buckets must be sorted and contiguous by start/end
    for (let i = 0; i < s.buckets.length; i++) {
      const bucket = s.buckets[i];
      // upvotes/downvotes non-negative and netScore consistent
      TestValidator.predicate(
        "bucket upvotes should be non-negative",
        bucket.upvotes >= 0,
      );
      TestValidator.predicate(
        "bucket downvotes should be non-negative",
        bucket.downvotes >= 0,
      );
      TestValidator.equals(
        "bucket netScore must equal upvotes - downvotes",
        bucket.netScore,
        bucket.upvotes - bucket.downvotes,
      );

      if (i + 1 < s.buckets.length) {
        const next = s.buckets[i + 1];
        TestValidator.equals(
          "buckets must be contiguous (current end === next start)",
          bucket.end,
          next.start,
        );
      }
    }
  }

  // metadata validations
  if (analytics.metadata) {
    TestValidator.predicate(
      "metadata.totalEvents should be non-negative",
      analytics.metadata.totalEvents >= 0,
    );
    TestValidator.equals(
      "metadata.approximationApplied should be false for small dataset",
      analytics.metadata.approximationApplied,
      false,
    );

    if (analytics.metadata.normalizedFilters) {
      const nf = analytics.metadata.normalizedFilters;
      TestValidator.equals(
        "normalizedFilters.granularity should match analytics.granularity",
        nf.granularity,
        analytics.granularity,
      );
      TestValidator.equals(
        "normalizedFilters.includeKarma should be false",
        nf.includeKarma,
        false,
      );
    }
  }
}
