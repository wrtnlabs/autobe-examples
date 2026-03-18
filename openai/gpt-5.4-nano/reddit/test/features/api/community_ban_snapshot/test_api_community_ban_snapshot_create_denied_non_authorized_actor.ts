import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot } from "../../../generate/generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot";
import { prepare_random_community_platform_community_ban_snapshot } from "../../../prepare/prepare_random_community_platform_community_ban_snapshot";

export async function test_api_community_ban_snapshot_create_denied_non_authorized_actor(
  connection: api.IConnection,
): Promise<void> {
  // Member (non-admin) actor
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Admin creates an existing ban snapshot to obtain a real community_ban_id (banId)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const existingSnapshot =
    await generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot(
      adminConnection,
      {
        params: {
          banId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(existingSnapshot);
  const banId = existingSnapshot.community_ban_id;
  const payload = {
    ban_status: RandomGenerator.alphabets(12),
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies ICommunityPlatformCommunityBanSnapshot.ICreate;
  await TestValidator.httpError(
    "should deny snapshot creation for non-authorized member",
    [401, 403],
    async () => {
      await generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot(
        memberConnection,
        {
          params: {
            banId,
          },
          body: payload,
        },
      );
    },
  );
}
