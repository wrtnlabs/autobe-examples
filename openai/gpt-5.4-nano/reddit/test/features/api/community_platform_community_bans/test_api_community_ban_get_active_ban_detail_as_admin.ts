import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_bans_create } from "../../../generate/generate_random_community_platform_admin_bans_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_ban_get_active_ban_detail_as_admin(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Prepare a consistent ban create payload, then force it to be active.
  const prepared: ICommunityPlatformCommunityBan.ICreate =
    prepare_random_community_platform_community_ban({
      banned_at: new Date().toISOString(),
      unbanned_at: null,
    }) satisfies ICommunityPlatformCommunityBan.ICreate;
  const ban = await generate_random_community_platform_admin_bans_create(
    adminConnection,
    {
      body: prepared,
    },
  );
  typia.assert(ban);
  const detail = await api.functional.communityPlatform.admin.bans.at(
    adminConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("ban id matches", detail.id, ban.id);
  TestValidator.equals("bannedAt matches", detail.bannedAt, ban.bannedAt);
  TestValidator.equals(
    "unbannedAt is null for active ban",
    detail.unbannedAt,
    null,
  );
  TestValidator.equals("banReason matches", detail.banReason, ban.banReason);
  TestValidator.equals("createdAt matches", detail.createdAt, ban.createdAt);
  TestValidator.equals("updatedAt matches", detail.updatedAt, ban.updatedAt);
  TestValidator.equals(
    "community.id matches",
    detail.community.id,
    ban.community.id,
  );
  TestValidator.equals(
    "bannedUser.id matches",
    detail.bannedUser.id,
    ban.bannedUser.id,
  );
  TestValidator.equals(
    "appliedByModerator.id matches",
    detail.appliedByModerator.id,
    ban.appliedByModerator.id,
  );
}
