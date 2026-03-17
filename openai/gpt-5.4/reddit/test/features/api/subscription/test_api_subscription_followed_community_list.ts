import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
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

export async function test_api_subscription_followed_community_list(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const uniqueToken = RandomGenerator.alphaNumeric(8).toLowerCase();
  const matchingCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `followed-${uniqueToken}-${RandomGenerator.alphabets(6)}`,
          title: `Followed ${uniqueToken} ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(matchingCommunity);
  const secondCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `followed-${RandomGenerator.alphaNumeric(10).toLowerCase()}`,
          title: `Followed ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(secondCommunity);
  const thirdCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `followed-${RandomGenerator.alphaNumeric(10).toLowerCase()}`,
          title: `Followed ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(thirdCommunity);
  const firstSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: matchingCommunity.slug,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(firstSubscription);
  TestValidator.equals(
    "first subscription targets matching community",
    firstSubscription.community.id,
    matchingCommunity.id,
  );
  TestValidator.equals(
    "first subscription is active",
    firstSubscription.active,
    true,
  );
  const secondSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: secondCommunity.slug,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(secondSubscription);
  TestValidator.equals(
    "second subscription targets second community",
    secondSubscription.community.id,
    secondCommunity.id,
  );
  TestValidator.equals(
    "second subscription is active",
    secondSubscription.active,
    true,
  );
  const thirdSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: thirdCommunity.slug,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(thirdSubscription);
  TestValidator.equals(
    "third subscription targets third community",
    thirdSubscription.community.id,
    thirdCommunity.id,
  );
  TestValidator.equals(
    "third subscription is active",
    thirdSubscription.active,
    true,
  );
  const list =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "+title",
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(list);
  TestValidator.equals(
    "pagination current page matches request",
    list.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    list.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination record count matches subscribed communities",
    list.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination page count matches record and limit calculation",
    list.pagination.pages,
    Math.ceil(list.pagination.records / list.pagination.limit),
  );
  TestValidator.predicate(
    "pagination records cover returned data length",
    list.pagination.records >= list.data.length,
  );
  TestValidator.equals(
    "all followed communities are returned",
    list.data.length,
    3,
  );
  const expectedIds = [
    matchingCommunity.id,
    secondCommunity.id,
    thirdCommunity.id,
  ].sort();
  const actualIds = list.data.map((community) => community.id).sort();
  TestValidator.equals(
    "returned ids match subscribed community ids",
    actualIds,
    expectedIds,
  );
  TestValidator.equals(
    "returned communities are unique",
    new Set(actualIds).size,
    actualIds.length,
  );
  for (const item of list.data) {
    TestValidator.predicate(
      "list item is strict community summary",
      typia.equals<ICommunityPlatformCommunity.ISummary>(item),
    );
    TestValidator.equals(
      "subscriber count is derived from active subscriptions",
      item.subscriber_count,
      1,
    );
    TestValidator.equals(
      "followed community is active and not deleted",
      item.deleted_at,
      null,
    );
  }
  const searched =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: uniqueToken,
          sort: "+title",
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(searched);
  TestValidator.equals(
    "search pagination current page matches request",
    searched.pagination.current,
    1,
  );
  TestValidator.equals(
    "search pagination limit matches request",
    searched.pagination.limit,
    10,
  );
  TestValidator.equals(
    "search returns one matching followed community",
    searched.data.length,
    1,
  );
  TestValidator.equals(
    "search record count matches one followed community",
    searched.pagination.records,
    1,
  );
  TestValidator.equals(
    "search page count matches record and limit calculation",
    searched.pagination.pages,
    Math.ceil(searched.pagination.records / searched.pagination.limit),
  );
  TestValidator.predicate(
    "search pagination records cover returned data length",
    searched.pagination.records >= searched.data.length,
  );
  TestValidator.equals(
    "search returns the matching subscribed community",
    searched.data[0]!.id,
    matchingCommunity.id,
  );
  TestValidator.equals(
    "search result slug matches created community",
    searched.data[0]!.slug,
    matchingCommunity.slug,
  );
  TestValidator.equals(
    "search result title matches created community",
    searched.data[0]!.title,
    matchingCommunity.title,
  );
  TestValidator.equals(
    "search result description matches created community",
    searched.data[0]!.description,
    matchingCommunity.description,
  );
  TestValidator.equals(
    "search result is not deleted",
    searched.data[0]!.deleted_at,
    null,
  );
  TestValidator.equals(
    "search result subscriber count is derived from active subscriptions",
    searched.data[0]!.subscriber_count,
    1,
  );
  TestValidator.predicate(
    "search token matches returned followed community title",
    searched.data[0]!.title.toLowerCase().includes(uniqueToken),
  );
  TestValidator.predicate(
    "search item is strict community summary",
    typia.equals<ICommunityPlatformCommunity.ISummary>(searched.data[0]!),
  );
}
