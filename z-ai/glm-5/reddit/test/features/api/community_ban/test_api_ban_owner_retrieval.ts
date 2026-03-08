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

export async function test_api_ban_owner_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create member to be banned and authenticate
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  // 3. Create community (owner is automatically assigned)
  const communityName = RandomGenerator.alphaNumeric(10);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 4. Create ban record for the member
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          bannedUserId: bannedMember.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(ban);
  // 5. Retrieve ban details as owner
  const retrievedBan =
    await api.functional.communityPlatform.member.communities.bans.at(
      ownerConnection,
      {
        communityName: community.name,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // 6. Validate response
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned user id matches",
    retrievedBan.bannedUser.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "banned user username matches",
    retrievedBan.bannedUser.username,
    bannedMember.username,
  );
  TestValidator.equals(
    "banned user display_name matches",
    retrievedBan.bannedUser.display_name,
    bannedMember.displayName,
  );
  TestValidator.equals(
    "banned by id matches",
    retrievedBan.bannedBy.id,
    owner.id,
  );
  TestValidator.equals(
    "banned by username matches",
    retrievedBan.bannedBy.username,
    owner.username,
  );
  TestValidator.equals(
    "banned by display_name matches",
    retrievedBan.bannedBy.display_name,
    owner.displayName,
  );
  TestValidator.equals("reason matches", retrievedBan.reason, ban.reason);
  TestValidator.predicate("created_at is valid", !!retrievedBan.created_at);
  TestValidator.equals(
    "deleted_at is null for active ban",
    retrievedBan.deleted_at,
    null,
  );
}
