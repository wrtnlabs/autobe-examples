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

export async function test_api_ban_update_expiration_change(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for ban operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12341234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // Create a temporary ban with initial expiration
  const ban =
    await api.functional.redditPlatform.admin.redditPlatform.bans.create(
      adminConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          user_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Test ban for expiration change",
          expired_at: null, // Start with permanent ban
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals("initial ban is permanent", ban.expiredAt, null);
  // Update the ban to have an expiration time
  const futureTime = new Date();
  futureTime.setHours(futureTime.getHours() + 24);
  const updatedBan =
    await api.functional.redditPlatform.admin.redditPlatform.bans.update(
      adminConnection,
      {
        banId: ban.id,
        body: {
          reason: "Updated ban reason",
          expired_at: futureTime.toISOString(),
        } satisfies IRedditPlatformBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Verify the expiration time was updated correctly
  TestValidator.equals(
    "ban reason updated",
    updatedBan.reason,
    "Updated ban reason",
  );
  TestValidator.predicate(
    "ban now has expiration",
    updatedBan.expiredAt !== null,
  );
  if (updatedBan.expiredAt !== null) {
    const expectedTime = new Date(futureTime).getTime();
    const actualTime = new Date(updatedBan.expiredAt).getTime();
    TestValidator.equals("expiration time matches", actualTime, expectedTime);
  }
}
