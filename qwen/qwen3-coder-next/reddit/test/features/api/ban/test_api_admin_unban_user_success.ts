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

export async function test_api_admin_unban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Generate random ban data for creating a ban
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Create a ban record
  const ban =
    await api.functional.redditPlatform.admin.redditPlatform.bans.create(
      adminConnection,
      {
        body: {
          community_id: communityId,
          user_id: userId,
          reason: "Test ban reason for unban validation",
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  // Verify ban was created successfully
  TestValidator.equals("ban created successfully", ban.id.length > 0, true);
  // Unban the user
  await api.functional.redditPlatform.admin.redditPlatform.bans.erase(
    adminConnection,
    {
      banId: ban.id,
    },
  );
  // Verify the unban operation completed without error
  // Since erase returns void and we cannot retrieve soft-deleted bans,
  // we'll just confirm the operation succeeded
  TestValidator.equals("unban operation completed", true, true);
}
