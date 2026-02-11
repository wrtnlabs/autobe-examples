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

export async function test_api_admin_ban_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditPlatformAdmin.IJoin;
  const adminLoginResult = await authorize_admin_join(adminConnection, {
    body: adminCreds,
  });
  typia.assert(adminLoginResult);
  // 2. Generate mock UUIDs for community and user (since we can't create them directly)
  const mockCommunityId = typia.random<string & tags.Format<"uuid">>();
  const mockUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a ban record with mock community and user IDs
  const banCreation =
    await api.functional.redditPlatform.admin.redditPlatform.bans.create(
      adminConnection,
      {
        body: {
          community_id: mockCommunityId,
          user_id: mockUserId,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expired_at: null,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(banCreation);
  // 4. Retrieve the ban detail
  const retrievedBan =
    await api.functional.redditPlatform.admin.redditPlatform.bans.at(
      adminConnection,
      {
        banId: banCreation.id,
      },
    );
  typia.assert(retrievedBan);
  // 5. Validate the retrieved ban detail
  TestValidator.equals("ban ID matches", retrievedBan.id, banCreation.id);
  TestValidator.equals(
    "community matches",
    retrievedBan.community.id,
    banCreation.community.id,
  );
  TestValidator.equals(
    "banned user matches",
    retrievedBan.user.id,
    banCreation.user.id,
  );
  TestValidator.equals(
    "moderator matches",
    retrievedBan.bannedBy.id,
    adminLoginResult.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedBan.reason,
    banCreation.reason,
  );
  TestValidator.predicate(
    "bannedAt exists",
    retrievedBan.bannedAt !== null && retrievedBan.bannedAt !== undefined,
  );
  TestValidator.equals(
    "expiredAt matches",
    retrievedBan.expiredAt,
    banCreation.expiredAt,
  );
}
