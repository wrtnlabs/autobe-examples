import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_ban_list_by_community(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: `owner_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerAuthedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: ownerAuth.token.access,
    },
  };
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerAuthedConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        },
      },
    );
  typia.assert(community);
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: `banned_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  const targetBan =
    await generate_random_community_platform_member_communities_bans_create(
      ownerAuthedConnection,
      {
        params: { communityId: community.id },
        body: {
          communityPlatformMemberId: bannedMemberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          startedAt: new Date().toISOString(),
          endedAt: null,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(targetBan);
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerAuthedConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}_other`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        },
      },
    );
  typia.assert(otherCommunity);
  const otherBan =
    await generate_random_community_platform_member_communities_bans_create(
      ownerAuthedConnection,
      {
        params: { communityId: otherCommunity.id },
        body: {
          communityPlatformMemberId: bannedMemberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          startedAt: new Date().toISOString(),
          endedAt: null,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(otherBan);
  const firstPage =
    await api.functional.communityPlatform.member.communities.bans.index(
      ownerAuthedConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          sort: "new",
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "ban list community scope records",
    firstPage.data.length,
    1,
  );
  TestValidator.equals(
    "ban list community id",
    firstPage.data[0].community.id,
    community.id,
  );
  TestValidator.equals(
    "ban list community name",
    firstPage.data[0].community.name,
    community.name,
  );
  TestValidator.equals(
    "ban list reason",
    firstPage.data[0].reason,
    targetBan.reason,
  );
  TestValidator.equals(
    "ban list startedAt",
    firstPage.data[0].started_at,
    targetBan.startedAt,
  );
  TestValidator.equals(
    "ban list endedAt",
    firstPage.data[0].ended_at,
    targetBan.endedAt,
  );
  TestValidator.equals(
    "ban list pagination current",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "ban list pagination limit",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "ban list pagination records",
    firstPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "ban list pagination pages",
    firstPage.pagination.pages,
    1,
  );
  const secondPage =
    await api.functional.communityPlatform.member.communities.bans.index(
      ownerAuthedConnection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 1,
          sort: "new",
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "ban list page 2 community scope records",
    secondPage.data.length,
    0,
  );
  TestValidator.equals(
    "ban list page 2 pagination current",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "ban list page 2 pagination limit",
    secondPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "ban list page 2 pagination records",
    secondPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "ban list page 2 pagination pages",
    secondPage.pagination.pages,
    1,
  );
  TestValidator.notEquals(
    "ban list should not include other community ban",
    firstPage.data[0].community.id,
    otherBan.community.id,
  );
}
