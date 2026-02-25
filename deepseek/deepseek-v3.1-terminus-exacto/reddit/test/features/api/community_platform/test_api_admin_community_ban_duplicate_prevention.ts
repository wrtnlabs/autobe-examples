import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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

export async function test_api_admin_community_ban_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate test data
  const communityId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;
  const userId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;
  // Create first ban successfully
  const firstBan =
    await api.functional.communityPlatform.admin.communities.bans.create(
      adminConnection,
      {
        communityId: communityId,
        body: {
          user_id: userId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(firstBan);
  // Attempt duplicate ban - should fail
  await TestValidator.error("duplicate ban prevention", async () => {
    await api.functional.communityPlatform.admin.communities.bans.create(
      adminConnection,
      {
        communityId: communityId,
        body: {
          user_id: userId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  });
  // Validate first ban details
  TestValidator.equals("ban has correct user", firstBan.user.id, userId);
  TestValidator.equals(
    "ban has correct community",
    firstBan.community.id,
    communityId,
  );
  TestValidator.equals("ban status is active", firstBan.status, "active");
}
