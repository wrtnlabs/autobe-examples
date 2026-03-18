import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
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
import { generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot } from "../../../generate/generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_ban_snapshot } from "../../../prepare/prepare_random_community_platform_community_ban_snapshot";

export async function test_api_community_ban_snapshot_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication (use utility with correct login DTO)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2) Create an active community ban (using generation utility)
  const ban = await generate_random_community_platform_admin_bans_create(
    adminConnection,
    {
      body: undefined,
    },
  );
  typia.assert(ban);
  const banId = ban.id;
  // 3) Create a snapshot for the ban
  const effectiveFrom = new Date().toISOString();
  const effectiveUntil = null as (string & tags.Format<"date-time">) | null;
  const banStatus = RandomGenerator.alphabets(12);
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const snapshot =
    await generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot(
      adminConnection,
      {
        params: { banId },
        body: {
          ban_status: banStatus,
          reason,
          effective_from: effectiveFrom,
          effective_until: effectiveUntil,
        } satisfies ICommunityPlatformCommunityBanSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4) Validations
  TestValidator.equals(
    "community_ban_id matches path banId",
    snapshot.community_ban_id,
    banId,
  );
  TestValidator.equals("ban_status matches", snapshot.ban_status, banStatus);
  TestValidator.equals("reason matches", snapshot.reason, reason);
  TestValidator.equals(
    "effective_from matches",
    snapshot.effective_from,
    effectiveFrom,
  );
  TestValidator.equals(
    "effective_until matches",
    snapshot.effective_until,
    effectiveUntil,
  );
  TestValidator.equals(
    "deleted_at is null for fresh snapshot",
    snapshot.deleted_at,
    null,
  );
  TestValidator.equals(
    "community_id matches ban community",
    snapshot.community_id,
    ban.community.id,
  );
}
