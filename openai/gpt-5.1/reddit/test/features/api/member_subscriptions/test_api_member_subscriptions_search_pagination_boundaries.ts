import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

export async function test_api_member_subscriptions_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember = await api.functional.auth.memberUser.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorizedMember);

  // 2. Create a community as this member user
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
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create more subscriptions than a typical page limit (e.g., 15)
  const totalSubscriptions = 15;

  await ArrayUtil.asyncRepeat(totalSubscriptions, async () => {
    const createSubBody = {
      community_platform_community_id: community.id,
      is_active: true,
      receive_notifications: true,
    } satisfies ICommunityPlatformCommunitySubscription.ICreate;

    const subscription =
      await api.functional.communityPlatform.memberUser.members.subscriptions.create(
        connection,
        {
          memberUserId: authorizedMember.id,
          body: createSubBody,
        },
      );
    typia.assert<ICommunityPlatformCommunitySubscription>(subscription);
  });

  // Helper to validate pagination metadata consistency
  const assertPaginationConsistent = (
    title: string,
    pagination: IPage.IPagination,
  ) => {
    const expectedPages =
      pagination.limit === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit);

    TestValidator.equals(
      `${title} - pages consistency`,
      pagination.pages,
      expectedPages,
    );

    TestValidator.predicate(
      `${title} - non-negative records`,
      pagination.records >= 0,
    );
  };

  // 4. Page 0, limit 10
  const page0Limit = 10 as const;
  const page0Response =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      {
        body: {
          page: 0,
          limit: page0Limit,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
    page0Response,
  );

  const page0Pagination = page0Response.pagination;
  const page0Data = page0Response.data;

  TestValidator.equals(
    "page 0 - current index is 0",
    page0Pagination.current,
    0,
  );
  TestValidator.equals(
    "page 0 - limit is 10",
    page0Pagination.limit,
    page0Limit,
  );

  TestValidator.predicate(
    "page 0 - total records at least created subscriptions",
    page0Pagination.records >= totalSubscriptions,
  );

  assertPaginationConsistent("page 0", page0Pagination);

  TestValidator.equals(
    "page 0 - data length equals limit",
    page0Data.length,
    page0Limit,
  );

  // Validate member and community for each summary
  for (const summary of page0Data) {
    TestValidator.equals(
      "page 0 - summary.member_user.id matches authorized member",
      summary.member_user.id,
      authorizedMember.id,
    );
    TestValidator.equals(
      "page 0 - summary.community.id matches created community",
      summary.community.id,
      community.id,
    );
  }

  // 5. Page 1, same limit
  const page1Response =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: page0Limit,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
    page1Response,
  );

  const page1Pagination = page1Response.pagination;
  const page1Data = page1Response.data;

  TestValidator.equals(
    "page 1 - current index is 1",
    page1Pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 - limit is 10",
    page1Pagination.limit,
    page0Limit,
  );

  TestValidator.equals(
    "page 1 - total records unchanged",
    page1Pagination.records,
    page0Pagination.records,
  );

  assertPaginationConsistent("page 1", page1Pagination);

  TestValidator.predicate(
    "page 1 - data length not more than limit",
    page1Data.length <= page0Limit,
  );

  for (const summary of page1Data) {
    TestValidator.equals(
      "page 1 - summary.member_user.id matches authorized member",
      summary.member_user.id,
      authorizedMember.id,
    );
    TestValidator.equals(
      "page 1 - summary.community.id matches created community",
      summary.community.id,
      community.id,
    );
  }

  // 6. Request a page index >= pages to ensure empty data but stable metadata
  const outOfRangePageIndex = page1Pagination.pages;

  const outOfRangeResponse =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      {
        body: {
          page: outOfRangePageIndex,
          limit: page0Limit,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
    outOfRangeResponse,
  );

  const outPagination = outOfRangeResponse.pagination;
  const outData = outOfRangeResponse.data;

  TestValidator.equals(
    "out-of-range - current index matches requested page",
    outPagination.current,
    outOfRangePageIndex,
  );

  TestValidator.equals(
    "out-of-range - records unchanged",
    outPagination.records,
    page1Pagination.records,
  );

  TestValidator.equals(
    "out-of-range - pages unchanged",
    outPagination.pages,
    page1Pagination.pages,
  );

  TestValidator.equals("out-of-range - data empty", outData.length, 0);

  // 7. Optional: boundary with small limit (limit=1 on page 0)
  const smallLimit = 1 as const;

  const smallLimitResponse =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      {
        body: {
          page: 0,
          limit: smallLimit,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
    smallLimitResponse,
  );

  const smallPagination = smallLimitResponse.pagination;
  const smallData = smallLimitResponse.data;

  TestValidator.equals(
    "small-limit - current index is 0",
    smallPagination.current,
    0,
  );
  TestValidator.equals(
    "small-limit - limit is 1",
    smallPagination.limit,
    smallLimit,
  );

  assertPaginationConsistent("small-limit", smallPagination);

  TestValidator.equals(
    "small-limit - single record returned",
    smallData.length,
    smallLimit,
  );

  for (const summary of smallData) {
    TestValidator.equals(
      "small-limit - summary.member_user.id matches authorized member",
      summary.member_user.id,
      authorizedMember.id,
    );
    TestValidator.equals(
      "small-limit - summary.community.id matches created community",
      summary.community.id,
      community.id,
    );
  }
}
