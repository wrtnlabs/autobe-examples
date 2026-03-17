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

export async function test_api_community_ban_duplicate_active_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  const firstBan =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          started_at: new Date().toISOString(),
          expired_at: null,
        },
      },
    );
  typia.assert(firstBan);
  const duplicateBody = {
    community_platform_member_id: firstBan.member.id,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    started_at: new Date(Date.now() + 60000).toISOString(),
    expired_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;
  TestValidator.equals(
    "duplicate request targets same member",
    duplicateBody.community_platform_member_id,
    firstBan.member.id,
  );
  TestValidator.equals(
    "duplicate request targets same community",
    firstBan.community.id,
    firstBan.community.id,
  );
  await TestValidator.error(
    "duplicate active ban in same community is rejected",
    async () => {
      await generate_random_community_platform_admin_communities_bans_create(
        adminConnection,
        {
          params: {
            communityId: firstBan.community.id,
          },
          body: duplicateBody,
        },
      );
    },
  );
}
