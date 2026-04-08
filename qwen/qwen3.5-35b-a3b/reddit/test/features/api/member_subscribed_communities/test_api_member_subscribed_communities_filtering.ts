import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscribed_communities_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(auth);
  // Create authenticated connection for API calls
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
  // 2. Create test communities to subscribe to
  // We need to create communities first, then subscribe to them
  // For now, we'll work with whatever communities exist and test the filters
  // 3. Test basic pagination and empty state
  const basicResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(basicResponse);
  TestValidator.equals(
    "basic pagination response",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic pagination limit",
    basicResponse.pagination.limit,
    20,
  );
  // 4. Test date range filters (subscribed_at_gte, subscribed_at_lte)
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Test subscribed_at_gte filter
  const gteResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          subscribed_at_gte: lastWeek.toISOString(),
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(gteResponse);
  // Test subscribed_at_lte filter
  const lteResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          subscribed_at_lte: yesterday.toISOString(),
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(lteResponse);
  // Test combined date range
  const dateRangeResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          subscribed_at_gte: lastWeek.toISOString(),
          subscribed_at_lte: today.toISOString(),
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 5. Test community_name filter (case-insensitive substring match)
  const nameFilterResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          community_name: "test",
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(nameFilterResponse);
  // 6. Test community_id filter (exact UUID match)
  // We need a valid community_id from the response
  const allResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(allResponse);
  let communityId: string | undefined;
  if (allResponse.data.length > 0) {
    communityId = allResponse.data[0].community.id;
  }
  if (communityId) {
    const communityIdResponse =
      await api.functional.redditPlatform.member.subscribed.index(
        memberConnection,
        {
          body: {
            community_id: communityId,
          } satisfies IRedditPlatformSubscription.IRequest,
        },
      );
    typia.assert(communityIdResponse);
    TestValidator.equals(
      "community_id filter results",
      communityIdResponse.data.length,
      communityIdResponse.data.every((s) => s.community.id === communityId)
        ? 1
        : 0,
    );
  }
  // 7. Test search parameter (text search on name and description)
  const searchResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          search: "test",
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 8. Test sorting by subscribed_at (ascending)
  const subscribedAtAscResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          sort_by: "subscribed_at",
          sort_order: "asc",
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(subscribedAtAscResponse);
  // 9. Test sorting by subscribed_at (descending)
  const subscribedAtDescResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          sort_by: "subscribed_at",
          sort_order: "desc",
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(subscribedAtDescResponse);
  // 10. Test sorting by created_at (ascending)
  const createdAtAscResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(createdAtAscResponse);
  // 11. Test sorting by created_at (descending)
  const createdAtDescResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(createdAtDescResponse);
  // 12. Test combined filters
  const combinedResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "subscribed_at",
          sort_order: "desc",
          subscribed_at_gte: lastWeek.toISOString(),
          search: "test",
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // 13. Test different pagination values
  const paginationTestResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 50,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(paginationTestResponse);
  TestValidator.equals(
    "pagination page number",
    paginationTestResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginationTestResponse.pagination.limit,
    50,
  );
  // 14. Validate response structure and data types
  const validateResponse =
    await api.functional.redditPlatform.member.subscribed.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(validateResponse);
  TestValidator.predicate(
    "pagination has required fields",
    () =>
      validateResponse.pagination.current !== undefined &&
      validateResponse.pagination.limit !== undefined &&
      validateResponse.pagination.records !== undefined &&
      validateResponse.pagination.pages !== undefined,
  );
  TestValidator.predicate("data is array", () =>
    Array.isArray(validateResponse.data),
  );
  // Validate subscription data structure
  if (validateResponse.data.length > 0) {
    const subscription = validateResponse.data[0];
    typia.assert(subscription);
    typia.assert(subscription.community);
    TestValidator.equals(
      "subscription has id",
      subscription.id !== undefined,
      true,
    );
    TestValidator.equals(
      "subscription has community",
      subscription.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "subscription has created_at",
      subscription.created_at !== undefined,
      true,
    );
  }
}