import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_subscribed_communities_list_excludes_unsubscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: authorized.token.access,
  };
  const communityA =
    await generate_random_community_platform_member_communities_create(
      authConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}-a`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUrl: "https://example.com/icon-a.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_member_communities_create(
      authConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}-b`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUrl: "https://example.com/icon-b.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  const subscriptionA =
    await api.functional.communityPlatform.member.communities.subscriptions.update(
      authConnection,
      {
        communityId: communityA.id,
      },
    );
  typia.assert(subscriptionA);
  const subscriptionB =
    await api.functional.communityPlatform.member.communities.subscriptions.update(
      authConnection,
      {
        communityId: communityB.id,
      },
    );
  typia.assert(subscriptionB);
  await api.functional.communityPlatform.member.communities.subscriptions.erase(
    authConnection,
    {
      communityId: communityB.id,
    },
  );
  const page =
    await api.functional.communityPlatform.member.communities.subscribed.index(
      authConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.equals("pagination records", page.pagination.records, 1);
  TestValidator.equals("pagination pages", page.pagination.pages, 1);
  TestValidator.equals("subscribed communities count", page.data.length, 1);
  TestValidator.predicate(
    "subscribed list contains remaining community",
    ArrayUtil.has(page.data, (item) => item.id === communityA.id),
  );
  TestValidator.predicate(
    "subscribed list excludes unsubscribed community",
    !ArrayUtil.has(page.data, (item) => item.id === communityB.id),
  );
  TestValidator.predicate(
    "subscribed list reflects current active state",
    page.data.every((item) => item.id !== communityB.id),
  );
}
