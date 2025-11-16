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

export async function test_api_member_subscriptions_search_with_date_and_status_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a community under the member user context
  const communityCreate = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create three subscriptions with different statuses for the same community
  const subPending: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
          status: "pending",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subPending);

  const subActive: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subActive);

  const subRejected: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
          status: "rejected",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subRejected);

  // 4. Build created_at-based time window filters for the active subscription
  const activeCreatedAt: string & tags.Format<"date-time"> =
    subActive.created_at;

  const request: ICommunityPlatformCommunitySubscription.IRequest = {
    page: 1,
    pageSize: 10,
    sortBy: "created_at",
    sortDirection: "asc",
    communityId: community.id,
    status: "active",
    createdFrom: activeCreatedAt,
    createdTo: activeCreatedAt,
  };

  // 5. Invoke the subscription search endpoint
  const page: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      {
        body: request,
      },
    );
  typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(page);

  // 6. Assert pagination metadata and filtered content
  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals("current page should be 1", pagination.current, 1);

  TestValidator.equals(
    "page size limit should match requested pageSize",
    pagination.limit,
    10,
  );

  TestValidator.equals(
    "records should match data length",
    pagination.records,
    page.data.length,
  );

  // We expect exactly one active subscription matching the tight created_at filter
  TestValidator.equals(
    "should return exactly one subscription",
    page.data.length,
    1,
  );

  const summary = page.data[0];

  TestValidator.equals(
    "summary status should be active",
    summary.status,
    "active",
  );

  TestValidator.equals(
    "summary community id should match created community",
    summary.community.id,
    community.id,
  );

  TestValidator.equals(
    "summary created_at should equal active subscription created_at",
    summary.created_at,
    activeCreatedAt,
  );

  TestValidator.equals(
    "summary id should match active subscription id",
    summary.id,
    subActive.id,
  );
}
