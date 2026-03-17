import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_bans_creation_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community where owner becomes community owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create regular member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  typia.assert(bannedMember);
  // 4. Create ban for member B in community
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban = await generate_random_community_platform_member_bans_create(
    ownerConnection,
    {
      body: {
        memberId: bannedMember.id,
        reason: banReason,
        expiresAt: null,
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // 5. Validate ban record fields
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.predicate("banned_at is valid ISO date", () =>
    typia.is<string & tags.Format<"date-time">>(ban.banned_at),
  );
  TestValidator.equals("active is true", ban.active, true);
  TestValidator.equals(
    "issuing moderator role type",
    ban.issuingModeratorRole.roleType,
    "owner",
  );
  TestValidator.equals(
    "banned member id",
    ban.bannedMember.id,
    bannedMember.id,
  );
  TestValidator.equals("community id", ban.community.id, community.id);
  TestValidator.predicate(
    "expires_at is null for permanent ban",
    () => ban.expires_at === null,
  );
  TestValidator.predicate(
    "unbanned_at is null",
    () => ban.unbanned_at === null,
  );
  TestValidator.predicate("deleted_at is null", () => ban.deleted_at === null);
}
