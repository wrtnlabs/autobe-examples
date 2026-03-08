import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_ban_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A (owner) registers and creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 2: Member B (target to be banned) registers
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 3: Owner bans Member B from the community
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await api.functional.communityPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          bannedUserId: memberB.id,
          reason: banReason,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Validations
  TestValidator.equals(
    "banned user matches Member B",
    ban.bannedUser.id,
    memberB.id,
  );
  TestValidator.equals("banner matches owner", ban.bannedBy.id, owner.id);
  TestValidator.equals("community matches", ban.community.id, community.id);
  TestValidator.equals("reason preserved", ban.reason, banReason);
  TestValidator.equals("deleted_at is null (active ban)", ban.deleted_at, null);
}
