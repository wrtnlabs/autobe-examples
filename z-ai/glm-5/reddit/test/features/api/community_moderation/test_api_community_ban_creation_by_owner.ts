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

export async function test_api_community_ban_creation_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(owner);
  // 2. Create community (owner automatically becomes community owner with moderation authority)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create member account who will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(member);
  // 4. Owner bans the member with a clear reason
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: member.id,
          reason: banReason,
        },
      },
    );
  typia.assert(ban);
  // 5. Validate ban record
  TestValidator.equals("ban member id matches", ban.member.id, member.id);
  TestValidator.equals(
    "ban community id matches",
    ban.community.id,
    community.id,
  );
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.equals(
    "ban is active (deleted_at is null)",
    ban.deleted_at,
    null,
  );
  TestValidator.predicate("ban has valid timestamp", ban.created_at !== null);
  // Validate moderator reference (should point to owner's moderator record)
  TestValidator.equals(
    "moderator member is owner",
    ban.moderator.member.id,
    owner.id,
  );
  TestValidator.equals(
    "moderator community matches",
    ban.moderator.community.id,
    community.id,
  );
  TestValidator.equals("moderator role is owner", ban.moderator.role, "owner");
  TestValidator.equals("moderator is active", ban.moderator.deleted_at, null);
  // Validate member summary in ban
  TestValidator.equals(
    "member username matches",
    ban.member.username,
    member.username,
  );
  // Validate community summary in ban
  TestValidator.equals(
    "community name matches",
    ban.community.name,
    community.name,
  );
}
