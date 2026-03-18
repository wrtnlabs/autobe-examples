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

export async function test_api_community_ban_snapshot_create_multiple_effective_windows(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };

  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;

  await authorize_admin_join(adminConnection, { body: adminCreds });

  const authorizedAdmin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminCreds.email,
      password: adminCreds.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(authorizedAdmin);

  const banConnection: api.IConnection = { host: connection.host };
  banConnection.headers = adminConnection.headers;

  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  const appliedByModeratorId = typia.random<string & tags.Format<"uuid">>();

  const ban = await generate_random_community_platform_admin_bans_create(
    banConnection,
    {
      body: {
        community_id: communityId,
        banned_user_id: bannedUserId,
        applied_by_moderator_id: appliedByModeratorId,
        ban_reason: RandomGenerator.paragraph({ sentences: 1 }),
        banned_at: new Date().toISOString(),
        unbanned_at: null,
      } satisfies ICommunityPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(ban);

  const T1 = new Date(Date.now() + 1000).toISOString();
  const T2 = new Date(Date.now() + 2000).toISOString();
  const T3 = new Date(Date.now() + 3000).toISOString();
  const reasonA = RandomGenerator.paragraph({ sentences: 1 });
  const reasonB = RandomGenerator.paragraph({ sentences: 1 });
  const statusA = RandomGenerator.alphabets(8);
  const statusB = RandomGenerator.alphabets(9);

  const snapshotConnection: api.IConnection = { host: connection.host };
  snapshotConnection.headers = adminConnection.headers;

  const snapshotA =
    await generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot(
      snapshotConnection,
      {
        params: { banId: ban.id },
        body: {
          ban_status: statusA,
          reason: reasonA,
          effective_from: T1,
          effective_until: T2,
        } satisfies ICommunityPlatformCommunityBanSnapshot.ICreate,
      },
    );
  typia.assert(snapshotA);

  const snapshotB =
    await generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot(
      snapshotConnection,
      {
        params: { banId: ban.id },
        body: {
          ban_status: statusB,
          reason: reasonB,
          effective_from: T3,
          effective_until: null,
        } satisfies ICommunityPlatformCommunityBanSnapshot.ICreate,
      },
    );
  typia.assert(snapshotB);

  TestValidator.notEquals("snapshot ids differ", snapshotA.id, snapshotB.id);
  TestValidator.equals(
    "snapshot A effective_from",
    snapshotA.effective_from,
    T1,
  );
  TestValidator.equals(
    "snapshot B effective_from",
    snapshotB.effective_from,
    T3,
  );
  TestValidator.equals(
    "snapshot A effective_until",
    snapshotA.effective_until,
    T2,
  );
  TestValidator.equals(
    "snapshot B effective_until",
    snapshotB.effective_until,
    null,
  );
  TestValidator.equals("snapshot A ban_status", snapshotA.ban_status, statusA);
  TestValidator.equals("snapshot B ban_status", snapshotB.ban_status, statusB);
  TestValidator.equals("snapshot A reason", snapshotA.reason, reasonA);
  TestValidator.equals("snapshot B reason", snapshotB.reason, reasonB);
}
