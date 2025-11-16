import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Validate pagination and sorting of member subscriptions search.
 *
 * Business flow
 *
 * 1. A new member user joins the platform (auth.memberUser.join).
 * 2. The member user creates a community that can be subscribed to.
 * 3. The same member user creates many subscriptions (more than one page).
 * 4. The member user searches subscriptions with page/pageSize and sorting options
 *    via PATCH /communityPlatform/memberUser/subscriptions.
 * 5. The test verifies that:
 *
 *    - Page 1 returns exactly `pageSize` items,
 *    - Pagination metadata (records, pages, limit, current) is consistent,
 *    - Items are ordered by created_at in the specified direction,
 *    - Page 2 is also sorted correctly and respects the same pagination rules.
 */
export async function test_api_member_subscriptions_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authenticated context
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorized);

  // 2. Create a single community for the member user
  const communityCreateBody = {
    identifier: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create many subscriptions (more than one page) for that member user
  const totalSubscriptions: number = 12;
  const createdSubscriptions: ICommunityPlatformCommunitySubscription[] = [];

  for (let i = 0; i < totalSubscriptions; i++) {
    const createBody = {
      community_id: community.id,
      status: "active",
    } satisfies ICommunityPlatformCommunitySubscription.ICreate;

    const subscription: ICommunityPlatformCommunitySubscription =
      await api.functional.communityPlatform.memberUser.subscriptions.create(
        connection,
        { body: createBody },
      );
    typia.assert(subscription);
    createdSubscriptions.push(subscription);
  }

  TestValidator.equals(
    "createdSubscriptions length should equal totalSubscriptions",
    createdSubscriptions.length,
    totalSubscriptions,
  );

  // Helper to assert ordering by created_at
  const assertSortedByCreatedAt = (
    title: string,
    rows: ICommunityPlatformCommunitySubscription.ISummary[],
    direction: "asc" | "desc",
  ) => {
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(curr.created_at).getTime();
      if (direction === "desc") {
        TestValidator.predicate(
          `${title} desc ordering at index ${i}`,
          prevTime >= currTime,
        );
      } else {
        TestValidator.predicate(
          `${title} asc ordering at index ${i}`,
          prevTime <= currTime,
        );
      }
    }
  };

  const pageSize = 5;

  // 4. Fetch first page, sorted by created_at desc
  const firstPageRequest = {
    page: 1,
    pageSize,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const firstPage: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      { body: firstPageRequest },
    );
  typia.assert(firstPage);

  // Validate pagination metadata for first page
  TestValidator.equals(
    "first page: pagination.limit equals requested pageSize",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "first page: pagination.current equals 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page: pagination.records equals totalSubscriptions",
    firstPage.pagination.records,
    totalSubscriptions,
  );

  const expectedPages = Math.ceil(
    firstPage.pagination.records / firstPage.pagination.limit,
  );
  TestValidator.equals(
    "first page: pagination.pages is consistent with records/limit",
    firstPage.pagination.pages,
    expectedPages,
  );

  TestValidator.equals(
    "first page: data length equals pageSize (or remaining if less)",
    firstPage.data.length,
    Math.min(pageSize, totalSubscriptions),
  );

  assertSortedByCreatedAt("first page", firstPage.data, "desc");

  // 5. Fetch second page with same sort options
  const secondPageRequest = {
    page: 2,
    pageSize,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const secondPage: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      { body: secondPageRequest },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page: pagination.limit equals requested pageSize",
    secondPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "second page: pagination.current equals 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page: pagination.records equals totalSubscriptions",
    secondPage.pagination.records,
    totalSubscriptions,
  );
  TestValidator.equals(
    "second page: pagination.pages matches first page",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );

  const remainingAfterFirst = totalSubscriptions - firstPage.data.length;
  TestValidator.equals(
    "second page: data length equals remaining or pageSize",
    secondPage.data.length,
    Math.min(pageSize, remainingAfterFirst),
  );

  assertSortedByCreatedAt("second page", secondPage.data, "desc");

  // 6. Optionally verify ascending order semantics
  const ascPageRequest = {
    page: 1,
    pageSize,
    sortBy: "created_at",
    sortDirection: "asc",
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const ascPage: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      { body: ascPageRequest },
    );
  typia.assert(ascPage);

  assertSortedByCreatedAt("ascending page", ascPage.data, "asc");
}
