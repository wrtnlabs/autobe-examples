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

export async function test_api_admin_unban_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminUser);
  // 2. Create a ban record
  const ban =
    await api.functional.redditPlatform.admin.redditPlatform.bans.create(
      adminConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          user_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Test ban for double unban scenario",
          expired_at: null,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  // 3. Soft-delete the ban first
  await api.functional.redditPlatform.admin.redditPlatform.bans.erase(
    adminConnection,
    {
      banId: ban.id,
    },
  );
  // 4. Attempt to unban the same ban record again (should fail)
  await TestValidator.error(
    "second unban should fail for already deleted ban",
    async () => {
      await api.functional.redditPlatform.admin.redditPlatform.bans.erase(
        adminConnection,
        {
          banId: ban.id,
        },
      );
    },
  );
}
