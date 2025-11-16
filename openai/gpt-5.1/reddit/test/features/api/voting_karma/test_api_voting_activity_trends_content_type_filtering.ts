import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends";
import type { ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsBucket";
import type { ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsSeries";

export async function test_api_voting_activity_trends_content_type_filtering(
  connection: api.IConnection,
) {
  // 1. Create platform admin and join/login
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // login explicitly (even though join already set token) to simulate actor switching pattern
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Create a visibility level as platformAdmin
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  // 3. Create member user (author / voter)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // login as memberUser (actor switch from platformAdmin to memberUser)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. As platformAdmin again, create two post types
  // Switch back to platformAdmin (login again to ensure token context)
  const adminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const textPostTypeBody = {
    code: "TEXT",
    name: "Text Post",
    description: "Plain text discussion posts.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const linkPostTypeBody = {
    code: "LINK",
    name: "Link Post",
    description: "Link sharing posts.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const textPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: textPostTypeBody,
      },
    );
  typia.assert(textPostType);

  const linkPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: linkPostTypeBody,
      },
    );
  typia.assert(linkPostType);

  // 5. As memberUser, create a community referencing visibility level
  const memberLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAgain);

  const communityCreateBody = {
    identifier: `analytics-${RandomGenerator.alphaNumeric(8)}`,
    title: "Analytics Test Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Seed posts: TEXT vs LINK
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const windowStart = new Date(now.getTime() - oneDayMs * 3);
  const windowEnd = new Date(now.getTime() + oneDayMs * 1);

  const createPost = async (
    postTypeId: string & tags.Format<"uuid">,
    titlePrefix: string,
    isText: boolean,
  ): Promise<ICommunityPlatformPost> => {
    const postBody = {
      community_id: community.id,
      post_type_id: postTypeId,
      title: `${titlePrefix} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
      body: isText ? RandomGenerator.content({ paragraphs: 1 }) : null,
      url: isText
        ? null
        : "https://example.com/" + RandomGenerator.alphaNumeric(6),
      image_uri: null,
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: postBody,
        },
      );
    typia.assert(post);
    return post;
  };

  const textPosts: ICommunityPlatformPost[] = [];
  const linkPosts: ICommunityPlatformPost[] = [];

  // more TEXT posts than LINK posts to bias counts
  for (let i = 0; i < 3; i++) {
    textPosts.push(await createPost(textPostType.id, "TEXT", true));
  }
  for (let i = 0; i < 2; i++) {
    linkPosts.push(await createPost(linkPostType.id, "LINK", false));
  }

  // 7. Seed votes with differing patterns by type
  const createVote = async (
    post: ICommunityPlatformPost,
    voteValue: -1 | 1,
  ): Promise<ICommunityPlatformPostVote> => {
    const voteBody = {
      community_platform_post_id: post.id,
      vote_value: voteValue,
    } satisfies ICommunityPlatformPostVote.ICreate;

    const vote: ICommunityPlatformPostVote =
      await api.functional.communityPlatform.memberUser.postVotes.create(
        connection,
        {
          body: voteBody,
        },
      );
    typia.assert(vote);
    return vote;
  };

  // For TEXT posts: more upvotes
  await ArrayUtil.asyncForEach(textPosts, async (post, index) => {
    const upvoteCount = index + 2; // 2,3,4 upvotes
    for (let i = 0; i < upvoteCount; i++) {
      await createVote(post, 1);
    }
  });

  // For LINK posts: fewer votes and include some downvotes
  await ArrayUtil.asyncForEach(linkPosts, async (post, index) => {
    const upvoteCount = index + 1; // 1,2 upvotes
    const downvoteCount = 1; // always 1 downvote
    for (let i = 0; i < upvoteCount; i++) {
      await createVote(post, 1);
    }
    for (let i = 0; i < downvoteCount; i++) {
      await createVote(post, -1);
    }
  });

  // 8. Call analytics endpoint for TEXT-only
  const trendsText: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      {
        body: {
          startAt: windowStart.toISOString(),
          endAt: windowEnd.toISOString(),
          granularity: "day",
          communityIds: [community.id],
          includePostVotes: true,
          includeCommentVotes: false,
          contentTypes: ["TEXT"],
          maxBuckets: 100,
        } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest,
      },
    );
  typia.assert(trendsText);

  TestValidator.predicate(
    "TEXT-only trends should have positive totalVotes",
    trendsText.totalVotes > 0,
  );
  TestValidator.predicate(
    "TEXT-only trends should have at least one series",
    trendsText.series.length > 0,
  );

  // 9. Call analytics endpoint for LINK-only
  const trendsLink: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      {
        body: {
          startAt: windowStart.toISOString(),
          endAt: windowEnd.toISOString(),
          granularity: "day",
          communityIds: [community.id],
          includePostVotes: true,
          includeCommentVotes: false,
          contentTypes: ["LINK"],
          maxBuckets: 100,
        } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest,
      },
    );
  typia.assert(trendsLink);

  TestValidator.predicate(
    "LINK-only trends should have positive totalVotes",
    trendsLink.totalVotes > 0,
  );
  TestValidator.predicate(
    "LINK-only trends should have at least one series",
    trendsLink.series.length > 0,
  );

  // Compare totals and patterns: we expect some difference due to seeding
  TestValidator.predicate(
    "TEXT-only and LINK-only totalVotes should differ given biased seeding",
    trendsText.totalVotes !== trendsLink.totalVotes,
  );

  // Additionally, compare aggregate upvoteRatio across all buckets if available
  const aggregateUpvoteRatio = (
    trends: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends,
  ): number => {
    let upVotes = 0;
    let totalVotes = 0;
    trends.series.forEach((series) => {
      series.buckets.forEach((bucket) => {
        upVotes += bucket.upVotes;
        totalVotes += bucket.totalVotes;
      });
    });
    return totalVotes === 0 ? 0 : upVotes / totalVotes;
  };

  const textUpvoteRatio = aggregateUpvoteRatio(trendsText);
  const linkUpvoteRatio = aggregateUpvoteRatio(trendsLink);

  TestValidator.predicate(
    "TEXT-only and LINK-only upvote ratios should differ due to different patterns",
    textUpvoteRatio !== linkUpvoteRatio,
  );

  // 10. Call analytics with combined contentTypes omitted (all types)
  const trendsAll: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      {
        body: {
          startAt: windowStart.toISOString(),
          endAt: windowEnd.toISOString(),
          granularity: "day",
          communityIds: [community.id],
          includePostVotes: true,
          includeCommentVotes: false,
          // contentTypes omitted => all
          maxBuckets: 100,
        } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest,
      },
    );
  typia.assert(trendsAll);

  TestValidator.predicate(
    "All-content trends totalVotes should be at least the maximum of TEXT-only and LINK-only totals",
    trendsAll.totalVotes >= trendsText.totalVotes &&
      trendsAll.totalVotes >= trendsLink.totalVotes,
  );
}
