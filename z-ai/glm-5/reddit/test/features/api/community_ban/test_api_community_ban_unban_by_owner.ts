import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_ban_unban_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member1 (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Member1 creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Create Member2 (user to be banned and unbanned)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Step 4: Owner bans Member2 from the community
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: member2.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(ban);
  // Verify ban is active (deleted_at should be null)
  TestValidator.equals("ban should be active initially", ban.deleted_at, null);
  // Step 5: Owner unbans Member2
  await api.functional.communityPlatform.member.communities.bans.erase(
    ownerConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // Step 6: Verify unban was successful by attempting to ban again
  // If unban worked, Member2 should be able to be banned again (no active ban)
  const newBan =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: member2.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(newBan);
  // Verify new ban is different from original ban
  TestValidator.notEquals(
    "new ban should have different ID",
    newBan.id,
    ban.id,
  );
  TestValidator.equals("new ban should be active", newBan.deleted_at, null);
}
