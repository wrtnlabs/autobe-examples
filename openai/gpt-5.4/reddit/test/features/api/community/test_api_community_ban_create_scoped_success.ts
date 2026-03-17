import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_ban_create_scoped_success(
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
    },
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const startedAt = new Date().toISOString();
  const expiredAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const ban =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId,
        },
        body: {
          reason,
          started_at: startedAt,
          expired_at: expiredAt,
        },
      },
    );
  typia.assert(ban);
  TestValidator.notEquals(
    "ban id should be generated",
    ban.id,
    ban.community.id,
  );
  TestValidator.notEquals(
    "ban id should differ from member id",
    ban.id,
    ban.member.id,
  );
  TestValidator.equals(
    "community scope should match requested community",
    ban.community.id,
    communityId,
  );
  TestValidator.equals(
    "reason should match submitted reason",
    ban.reason,
    reason,
  );
  TestValidator.equals("status should be active", ban.status, "active");
  TestValidator.equals(
    "started_at should match submitted value",
    ban.started_at,
    startedAt,
  );
  TestValidator.equals(
    "expired_at should match submitted temporary expiry",
    ban.expired_at,
    expiredAt,
  );
  TestValidator.equals("lifted_at should start null", ban.lifted_at, null);
  TestValidator.equals("deleted_at should start null", ban.deleted_at, null);
}
