import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_bans_create } from "../../../generate/generate_random_community_platform_admin_bans_create";
import { prepare_random_community_platform_moderation_ban } from "../../../prepare/prepare_random_community_platform_moderation_ban";

export async function test_api_community_ban_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create permanent ban
  const ban = await generate_random_community_platform_admin_bans_create(
    adminConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        user_id: typia.random<string & tags.Format<"uuid">>(),
        moderator_id: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        duration: "permanent",
      } satisfies ICommunityPlatformModerationBan.ICreate,
    },
  );
  typia.assert(ban);
  // 3. Filter by duration='permanent' and verify response
  const response = await api.functional.communityPlatform.admin.bans.index(
    adminConnection,
    {
      body: {
        duration: "permanent",
      } satisfies ICommunityPlatformModerationBan.IRequest,
    },
  );
  typia.assert(response);
  // Verify permanent ban is included with ends_at=null
  const foundBan = response.data.find((b) => b.id === ban.id);
  if (!foundBan) {
    throw new Error("Ban not found in the response");
  }
  TestValidator.equals("ban duration matches", foundBan.duration, "permanent");
  TestValidator.equals(
    "ends_at should be null for permanent ban",
    foundBan.ends_at,
    null,
  );
}
