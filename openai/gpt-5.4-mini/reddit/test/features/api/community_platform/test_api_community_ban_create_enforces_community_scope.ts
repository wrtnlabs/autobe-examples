import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";

export async function test_api_community_ban_create_enforces_community_scope(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "A1!",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const startedAt = new Date().toISOString();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: { communityId },
        body: {
          communityPlatformMemberId: memberId,
          reason,
          startedAt,
          endedAt: null,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals("ban reason matches request", ban.reason, reason);
  TestValidator.equals(
    "ban startedAt matches request",
    ban.startedAt,
    startedAt,
  );
  TestValidator.equals("ban is active", ban.endedAt, null);
  TestValidator.equals("ban deletedAt is null", ban.deletedAt, null);
  TestValidator.predicate("ban id is generated", ban.id.length > 0);
}
