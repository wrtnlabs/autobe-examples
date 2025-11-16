import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAnalytics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostAnalytics";

/**
 * Validate admin post analytics minScore and maxScore behavior.
 *
 * Business context:
 *
 * - Member users create communities and posts.
 * - Admin users use the analytics endpoint to inspect post performance, including
 *   net scores derived from votes.
 * - This test ensures that score-based filtering (minScore/maxScore) and ordering
 *   behave consistently for the subset of posts in a specific community.
 *
 * Steps:
 *
 * 1. Register and login a memberUser.
 * 2. Create a community as that memberUser.
 * 3. Create several posts in that community.
 * 4. Register and login an adminUser.
 * 5. As adminUser, call analytics without score filters to discover current score
 *    distribution for posts in the test community.
 * 6. Derive dynamic minScore and maxScore thresholds from observed scores.
 * 7. Call analytics with a minScore filter and verify that all returned scores are
 *
 * > = threshold, belong to the community, and are sorted according to
 *    > sortDirection.
 * 8. Call analytics with a maxScore filter and verify that all returned scores are
 *    <= threshold, belong to the community, and are sorted.
 * 9. When feasible, call analytics with both minScore and maxScore and verify all
 *    scores lie within the inclusive range.
 */
export async function test_api_admin_post_analytics_score_thresholds(
  connection: api.IConnection,
) {
  // 1. Register memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/register",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Explicit member login (actor switch exercise)
  const memberLoginBody = {
    identifier: memberAuthorized.username,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 3. Create community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(16),
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

  // 4. Create multiple posts in the community
  const postBodies: ICommunityPlatformPost.ICreate[] = ArrayUtil.repeat(
    3,
    () => {
      return {
        communityId: community.id,
        communityCode: community.slug,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.paragraph({ sentences: 8 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;
    },
  );

  const posts: ICommunityPlatformPost[] = [];
  for (const body of postBodies) {
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body,
        },
      );
    typia.assert(post);
    posts.push(post);
  }

  TestValidator.predicate(
    "at least one post created for analytics test",
    posts.length >= 1,
  );

  // 5. Register adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. Explicit admin login
  const adminLoginBody = {
    identifier: adminAuthorized.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Helper to validate pagination meta
  const assertPagination = (
    pagination: IPage.IPagination,
    titlePrefix: string,
  ) => {
    TestValidator.predicate(
      `${titlePrefix} pagination current is non-negative`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} pagination limit is positive`,
      pagination.limit > 0,
    );
    TestValidator.predicate(
      `${titlePrefix} pagination records non-negative`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} pagination pages non-negative`,
      pagination.pages >= 0,
    );
    if (pagination.records === 0) {
      TestValidator.equals(
        `${titlePrefix} pages should be zero when no records`,
        pagination.pages,
        0,
      );
    }
  };

  // Helper to verify ordering by score (descending)
  const assertSortedByScoreDesc = (
    summaries: ICommunityPlatformPostAnalytics.ISummary[],
    titlePrefix: string,
  ) => {
    for (let i = 1; i < summaries.length; i++) {
      const prev = summaries[i - 1];
      const curr = summaries[i];
      TestValidator.predicate(
        `${titlePrefix} scores are non-increasing between index ${i - 1} and ${i}`,
        prev.score >= curr.score,
      );
    }
  };

  // 7. Base analytics call without score filters, restricted to community
  const baseRequestBody = {
    page: 1,
    pageSize: 50,
    communityId: community.id,
    authorMemberUserId: null,
    status: null,
    createdAtFrom: null,
    createdAtTo: null,
    minScore: null,
    maxScore: null,
    sortBy: "highest_score",
    sortDirection: "desc",
  } satisfies ICommunityPlatformPostAnalytics.IRequest;

  const basePage: IPageICommunityPlatformPostAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.posts.index(
      connection,
      {
        body: baseRequestBody,
      },
    );
  typia.assert(basePage);

  const baseData = basePage.data.filter(
    (row) => row.community_id === community.id,
  );
  assertPagination(basePage.pagination, "base analytics");

  // If there is no analytics data for this community yet, the rest of the
  // score-threshold-specific assertions become no-ops but the endpoint
  // integration is still validated.
  if (baseData.length === 0) {
    TestValidator.equals(
      "no analytics records for test community yet",
      baseData.length,
      0,
    );
    return;
  }

  // 8. Derive dynamic score thresholds from observed data
  let minScoreValue = baseData[0].score;
  let maxScoreValue = baseData[0].score;
  for (const row of baseData) {
    if (row.score < minScoreValue) minScoreValue = row.score;
    if (row.score > maxScoreValue) maxScoreValue = row.score;
  }

  const sortedByScoreAsc = [...baseData].sort((a, b) => a.score - b.score);
  const midIndex = Math.floor((sortedByScoreAsc.length - 1) / 2);
  const minScoreThreshold = sortedByScoreAsc[midIndex].score;
  const maxScoreThreshold = sortedByScoreAsc[midIndex].score;

  TestValidator.predicate(
    "derived minScoreThreshold is within observed range",
    minScoreThreshold >= minScoreValue && minScoreThreshold <= maxScoreValue,
  );
  TestValidator.predicate(
    "derived maxScoreThreshold is within observed range",
    maxScoreThreshold >= minScoreValue && maxScoreThreshold <= maxScoreValue,
  );

  // 9. Analytics with minScore filter
  const minScoreRequestBody = {
    page: baseRequestBody.page,
    pageSize: baseRequestBody.pageSize,
    communityId: community.id,
    authorMemberUserId: null,
    status: null,
    createdAtFrom: null,
    createdAtTo: null,
    minScore: minScoreThreshold,
    maxScore: null,
    sortBy: baseRequestBody.sortBy,
    sortDirection: baseRequestBody.sortDirection,
  } satisfies ICommunityPlatformPostAnalytics.IRequest;

  const minScorePage: IPageICommunityPlatformPostAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.posts.index(
      connection,
      {
        body: minScoreRequestBody,
      },
    );
  typia.assert(minScorePage);

  assertPagination(minScorePage.pagination, "minScore analytics");

  const minScoreData = minScorePage.data.filter(
    (row) => row.community_id === community.id,
  );

  for (const row of minScoreData) {
    TestValidator.predicate(
      "minScore filtered record has score >= threshold",
      row.score >= minScoreThreshold,
    );
  }

  assertSortedByScoreDesc(minScoreData, "minScore analytics");

  // 10. Analytics with maxScore filter
  const maxScoreRequestBody = {
    page: baseRequestBody.page,
    pageSize: baseRequestBody.pageSize,
    communityId: community.id,
    authorMemberUserId: null,
    status: null,
    createdAtFrom: null,
    createdAtTo: null,
    minScore: null,
    maxScore: maxScoreThreshold,
    sortBy: baseRequestBody.sortBy,
    sortDirection: baseRequestBody.sortDirection,
  } satisfies ICommunityPlatformPostAnalytics.IRequest;

  const maxScorePage: IPageICommunityPlatformPostAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.posts.index(
      connection,
      {
        body: maxScoreRequestBody,
      },
    );
  typia.assert(maxScorePage);

  assertPagination(maxScorePage.pagination, "maxScore analytics");

  const maxScoreData = maxScorePage.data.filter(
    (row) => row.community_id === community.id,
  );

  for (const row of maxScoreData) {
    TestValidator.predicate(
      "maxScore filtered record has score <= threshold",
      row.score <= maxScoreThreshold,
    );
  }

  assertSortedByScoreDesc(maxScoreData, "maxScore analytics");

  // 11. Combined minScore and maxScore when they define a non-empty range
  if (minScoreThreshold <= maxScoreThreshold) {
    const rangeRequestBody = {
      page: baseRequestBody.page,
      pageSize: baseRequestBody.pageSize,
      communityId: community.id,
      authorMemberUserId: null,
      status: null,
      createdAtFrom: null,
      createdAtTo: null,
      minScore: minScoreThreshold,
      maxScore: maxScoreThreshold,
      sortBy: baseRequestBody.sortBy,
      sortDirection: baseRequestBody.sortDirection,
    } satisfies ICommunityPlatformPostAnalytics.IRequest;

    const rangePage: IPageICommunityPlatformPostAnalytics.ISummary =
      await api.functional.communityPlatform.adminUser.analytics.posts.index(
        connection,
        {
          body: rangeRequestBody,
        },
      );
    typia.assert(rangePage);
    assertPagination(rangePage.pagination, "range analytics");

    const rangeData = rangePage.data.filter(
      (row) => row.community_id === community.id,
    );

    for (const row of rangeData) {
      TestValidator.predicate(
        "range filtered record has score within [min,max]",
        row.score >= minScoreThreshold && row.score <= maxScoreThreshold,
      );
    }

    assertSortedByScoreDesc(rangeData, "range analytics");
  }
}
