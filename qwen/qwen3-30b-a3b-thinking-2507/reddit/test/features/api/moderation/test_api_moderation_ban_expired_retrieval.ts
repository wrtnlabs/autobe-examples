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

export async function test_api_moderation_ban_expired_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Use a random ban ID to retrieve a ban record
  const randomBanId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve ban
  const retrievedBan = await api.functional.communityPlatform.admin.bans.at(
    adminConnection,
    {
      banId: randomBanId,
    },
  );
  typia.assert(retrievedBan);
  // 4. Validate
  TestValidator.predicate(
    "ban should be expired",
    new Date(retrievedBan.ends_at as string) < new Date(),
  );
  TestValidator.equals(
    "ban reason should match",
    retrievedBan.reason,
    "Test ban reason",
  );
  TestValidator.equals(
    "ban duration should match",
    retrievedBan.duration,
    "2 minutes",
  );
  TestValidator.equals(
    "ban community id should match",
    retrievedBan.community.id,
    randomBanId,
  );
  TestValidator.equals(
    "ban user id should match",
    (retrievedBan.user as { id: string }).id,
    randomBanId,
  );
  TestValidator.equals(
    "ban moderator id should match",
    (retrievedBan.moderator as { id: string }).id,
    randomBanId,
  );
}