import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

export async function test_api_community_banned_users_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as owner (member A)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a community as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Register as member B (to be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Register as member C (to be banned)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // 5. Ban member B from the community
  const banB =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        body: {
          member_id: memberB.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(banB);
  // 6. Ban member C from the community
  const banC =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        body: {
          member_id: memberC.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(banC);
  // 7. List bans with filter by bannedMemberUsername (partial match for member B)
  const usernamePrefix = memberB.username.substring(
    0,
    Math.min(3, memberB.username.length),
  );
  const filteredBans =
    await api.functional.communityPlatform.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          bannedMemberUsername: usernamePrefix,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(filteredBans);
  TestValidator.equals("filtered bans contain exactly one result",
    filteredBans.data.length,
    1,
  );
  TestValidator.equals("filtered ban matches member B",
    filteredBans.data[0]!.bannedMember.id,
    memberB.id,
  );
  // 8. List bans without filters
  const allBans =
    await api.functional.communityPlatform.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {} satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(allBans);
  TestValidator.equals("all bans contain both members", allBans.data.length, 2);
  TestValidator.predicate("member B is in results", () =>
    allBans.data.some((b) => b.bannedMember.id === memberB.id),
  );
  TestValidator.predicate("member C is in results", () =>
    allBans.data.some((b) => b.bannedMember.id === memberC.id),
  );
  // 9. Apply date range filter to future → no results
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  const futureFilteredBans =
    await api.functional.communityPlatform.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          fromDate: futureDate.toISOString(),
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(futureFilteredBans);
  TestValidator.equals("no bans in future date range",
    futureFilteredBans.data.length,
    0,
  );
  // 10. Filter by non-existent username → empty results
  const emptyBans =
    await api.functional.communityPlatform.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          bannedMemberUsername: "nonexistent-user-12345",
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(emptyBans);
  TestValidator.equals("empty results for non-existent username",
    emptyBans.data.length,
    0,
  );
}