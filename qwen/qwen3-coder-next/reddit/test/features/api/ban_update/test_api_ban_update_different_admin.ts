import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_platform_admin_reddit_platform_bans_create } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_bans_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";

export async function test_api_ban_update_different_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as first admin to create ban record
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await api.functional.redditPlatform.auth.admin.join(
    firstAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.name(),
        display_name: null,
        bio: null,
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(firstAdmin);
  // 2. Auth as different admin for update attempt
  const differentAdminConnection: api.IConnection = { host: connection.host };
  const differentAdmin = await api.functional.redditPlatform.auth.admin.join(
    differentAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.name(),
        display_name: null,
        bio: null,
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(differentAdmin);
  // 3. Create ban record as first admin (using first admin's connection)
  const ban =
    await api.functional.redditPlatform.admin.redditPlatform.bans.create(
      firstAdminConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          user_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expired_at: null,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  // 4. Update ban as different admin
  const updatedBan =
    await api.functional.redditPlatform.admin.redditPlatform.bans.update(
      differentAdminConnection,
      {
        banId: ban.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expired_at: null,
        } satisfies IRedditPlatformBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 5. Validate
  TestValidator.equals("ban ID matches", updatedBan.id, ban.id);
  TestValidator.notEquals("reason updated", updatedBan.reason, ban.reason);
}
