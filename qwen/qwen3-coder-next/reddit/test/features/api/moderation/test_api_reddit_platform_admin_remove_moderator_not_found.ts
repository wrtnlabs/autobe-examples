import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reddit_platform_admin_remove_moderator_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // Attempt to delete non-existent moderation with randomly generated ID
  const nonExistentModerationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("moderation not found", async () => {
    await api.functional.redditPlatform.admin.redditPlatform.moderations.erase(
      adminConnection,
      {
        moderationId: nonExistentModerationId,
      },
    );
  });
}
