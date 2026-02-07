import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_ban_update_to_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Get existing test ban to update (using example ID from test data)
  const existingBanId = "test-ban-123456";
  // 3. Update ban to permanent (set ends_at to null)
  const updatedBan = await api.functional.communityPlatform.admin.bans.update(
    adminConnection,
    {
      banId: existingBanId,
      body: {
        ends_at: null,
      } satisfies ICommunityPlatformModerationBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // 4. Validate outcomes
  TestValidator.equals("ban remains active", updatedBan.deleted_at, null);
  TestValidator.equals(
    "duration updates to permanent",
    updatedBan.duration,
    "permanent",
  );
  TestValidator.predicate("ends_at is null", updatedBan.ends_at === null);
}
