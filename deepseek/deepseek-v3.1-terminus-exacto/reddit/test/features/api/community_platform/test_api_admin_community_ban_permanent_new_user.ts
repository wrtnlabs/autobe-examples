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

/**
 * Test admin creation of a permanent ban on a new user in a community.
 *
 * This test verifies that an admin can successfully create a permanent ban
 * (expires_at = null) on a user who is not already banned in the community.
 * The ban record should contain complete information including status, timestamps,
 * and proper relationship objects.
 *
 * Note: This test uses randomly generated user and community IDs since the
 * actual user and community creation endpoints are not available in the
 * current API surface. This may result in validation errors if the backend
 * requires existing users and communities.
 */
export async function test_api_admin_community_ban_permanent_new_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate random user and community IDs (since creation endpoints not available)
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create permanent ban using utility function
  const ban =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: { communityId },
        body: {
          user_id: targetUserId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 4. Validate ban properties
  TestValidator.equals("ban status should be active", ban.status, "active");
  TestValidator.equals(
    "expires_at should be null for permanent ban",
    ban.expires_at,
    null,
  );
  TestValidator.predicate(
    "banned_at should be populated",
    ban.banned_at !== null,
  );
  TestValidator.predicate(
    "ban should have community relationship",
    ban.community !== null,
  );
  TestValidator.predicate(
    "ban should have user relationship",
    ban.user !== null,
  );
  TestValidator.predicate(
    "ban should have moderator relationship",
    ban.moderator !== null,
  );
  TestValidator.equals(
    "ban user ID should match target user",
    ban.user.id,
    targetUserId,
  );
  TestValidator.equals(
    "ban community ID should match",
    ban.community.id,
    communityId,
  );
}
