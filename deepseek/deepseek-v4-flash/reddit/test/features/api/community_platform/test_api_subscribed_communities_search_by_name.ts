import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_subscribed_communities_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create three communities with distinct names
  const techTalk =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: { name: "TechTalk" },
      },
    );
  typia.assert(techTalk);
  const gamingHub =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: { name: "GamingHub" },
      },
    );
  typia.assert(gamingHub);
  const musicLovers =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: { name: "MusicLovers" },
      },
    );
  typia.assert(musicLovers);
  // 3. Subscribe the member to all three communities
  const techSubscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      { params: { communityId: techTalk.id } },
    );
  typia.assert(techSubscription);
  const gamingSubscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      { params: { communityId: gamingHub.id } },
    );
  typia.assert(gamingSubscription);
  const musicSubscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      { params: { communityId: musicLovers.id } },
    );
  typia.assert(musicSubscription);
  // 4. Search for 'Tech' — should return only TechTalk
  const searchTech =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "Tech",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchTech);
  TestValidator.equals(
    "search Tech returns 1 result",
    searchTech.data.length,
    1,
  );
  TestValidator.equals(
    "search Tech returns TechTalk",
    searchTech.data[0]!.name,
    "TechTalk",
  );
  // 5. Search for 'gaming' (lowercase) — verify case-insensitive matching
  const searchGaming =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "gaming",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchGaming);
  TestValidator.equals(
    "search gaming returns 1 result",
    searchGaming.data.length,
    1,
  );
  TestValidator.equals(
    "search gaming returns GamingHub",
    searchGaming.data[0]!.name,
    "GamingHub",
  );
  // 6. Search for 'NonExistent' — should return empty list
  const searchNone =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "NonExistent",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchNone);
  TestValidator.equals(
    "search NonExistent returns 0 results",
    searchNone.data.length,
    0,
  );
  TestValidator.equals(
    "search NonExistent records count",
    searchNone.pagination.records,
    0,
  );
}
