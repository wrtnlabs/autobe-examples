import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_subscription_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection and register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create first community
  const firstCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  // Create second community
  const secondCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(secondCommunity);
  // Subscribe to first community
  const firstSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: firstCommunity.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(firstSubscription);
  // Subscribe to second community
  const secondSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: secondCommunity.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(secondSubscription);
  // Search subscriptions with basic pagination, filtering by current member
  const searchResult =
    await api.functional.communityPlatform.subscriptions.index(
      memberConnection,
      {
        body: {
          memberId: memberAuth.id,
          page: 1 satisfies number as number,
          limit: 20 satisfies number as number,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure (business logic validation)
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records should be at least 2",
    searchResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    searchResult.pagination.pages >= 1,
  );
  // Validate subscription data structure
  TestValidator.predicate(
    "data should be array",
    Array.isArray(searchResult.data),
  );
  // Find our created subscriptions in the results
  const foundFirst = searchResult.data.find(
    (sub) => sub.id === firstSubscription.id,
  );
  const foundSecond = searchResult.data.find(
    (sub) => sub.id === secondSubscription.id,
  );
  TestValidator.predicate(
    "first subscription should be found",
    foundFirst !== undefined,
  );
  TestValidator.predicate(
    "second subscription should be found",
    foundSecond !== undefined,
  );
  // Validate subscription summary structure (business logic)
  if (foundFirst) {
    TestValidator.equals(
      "first subscription active status",
      foundFirst.active,
      true,
    );
    TestValidator.equals(
      "first subscription member id",
      foundFirst.member.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "first subscription community id",
      foundFirst.community.id,
      firstCommunity.id,
    );
  }
  if (foundSecond) {
    TestValidator.equals(
      "second subscription active status",
      foundSecond.active,
      true,
    );
    TestValidator.equals(
      "second subscription member id",
      foundSecond.member.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "second subscription community id",
      foundSecond.community.id,
      secondCommunity.id,
    );
  }
}
