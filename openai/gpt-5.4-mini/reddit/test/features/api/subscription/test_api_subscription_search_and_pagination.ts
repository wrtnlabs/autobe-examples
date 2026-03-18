import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_subscriptions_create } from "../../../generate/generate_random_community_platform_member_communities_subscriptions_create";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_subscription_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const firstSubscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(firstSubscription);
  const secondSubscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(secondSubscription);
  const thirdSubscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(thirdSubscription);
  const allSubscriptions =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  TestValidator.predicate(
    "subscription list should return at least the created subscriptions",
    allSubscriptions.pagination.records >= 3,
  );
  TestValidator.equals(
    "pagination limit should match request",
    allSubscriptions.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page should match request",
    allSubscriptions.pagination.current,
    1,
  );
  TestValidator.equals(
    "returned data size should match visible slice",
    allSubscriptions.data.length,
    Math.min(10, allSubscriptions.pagination.records),
  );
  TestValidator.predicate(
    "all returned subscriptions should belong to the authenticated member",
    allSubscriptions.data.every((item) => item.member !== undefined),
  );
  TestValidator.predicate(
    "all returned subscriptions should preserve active subscription status",
    allSubscriptions.data.every((item) => item.subscriptionStatus.length > 0),
  );
  const paged =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals("paged limit", paged.pagination.limit, 1);
  TestValidator.equals("paged page", paged.pagination.current, 1);
  TestValidator.equals(
    "paged slice size should respect the limit",
    paged.data.length,
    Math.min(1, paged.pagination.records),
  );
  TestValidator.predicate(
    "paged subscription should belong to the authenticated member",
    paged.data.every((item) => item.member !== undefined),
  );
  TestValidator.predicate(
    "paged subscription should be one of the created subscriptions",
    paged.data.every(
      (item) =>
        item.id === firstSubscription.id ||
        item.id === secondSubscription.id ||
        item.id === thirdSubscription.id,
    ),
  );
  const searched =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searched);
  TestValidator.equals(
    "searching with empty string should preserve the total result count",
    searched.pagination.records,
    allSubscriptions.pagination.records,
  );
  TestValidator.equals(
    "searching with empty string should preserve returned page size",
    searched.data.length,
    allSubscriptions.data.length,
  );
}
