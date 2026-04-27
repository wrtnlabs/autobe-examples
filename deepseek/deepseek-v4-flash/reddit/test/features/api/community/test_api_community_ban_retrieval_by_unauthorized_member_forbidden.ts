import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_community_bans_create } from "../../../generate/generate_random_community_platform_member_community_bans_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

export async function test_api_community_ban_retrieval_by_unauthorized_member_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register three members
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(unauthorizedConnection, {});
  // 2. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner bans the second member from the community
  const ban =
    await generate_random_community_platform_member_community_bans_create(
      ownerConnection,
      {
        body: {
          communityCode: community.name,
          memberCode: bannedMember.username,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(ban);
  // 4. Verify the owner (as community owner with moderation role) can retrieve the ban record
  const retrievedByOwner =
    await api.functional.communityPlatform.member.community_bans.at(
      ownerConnection,
      { banId: ban.id },
    );
  typia.assert(retrievedByOwner);
  // 5. The unauthorized member (no moderation role) tries to retrieve the ban → expects 403 Forbidden
  await TestValidator.httpError(
    "unauthorized member cannot retrieve ban record",
    403,
    async () => {
      await api.functional.communityPlatform.member.community_bans.at(
        unauthorizedConnection,
        { banId: ban.id },
      );
    },
  );
}
