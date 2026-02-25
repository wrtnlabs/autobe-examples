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

export async function test_api_admin_community_ban_temporary_with_expiration(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Generate a future expiration date (24 hours from now)
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiresAt = futureDate.toISOString();
  // Create ban with temporary expiration
  const ban =
    await api.functional.communityPlatform.admin.communities.bans.create(
      adminConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: expiresAt,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Validate ban properties
  TestValidator.equals("ban status should be active", ban.status, "active");
  TestValidator.predicate(
    "banned_at should be recent",
    Date.now() - new Date(ban.banned_at).getTime() < 5000,
  );
  TestValidator.equals(
    "expires_at should match input",
    ban.expires_at,
    expiresAt,
  );
  TestValidator.predicate(
    "expires_at should be in the future",
    new Date(ban.expires_at!).getTime() > Date.now(),
  );
  // Validate relationships
  TestValidator.predicate(
    "community relationship should exist",
    ban.community.id !== undefined,
  );
  TestValidator.predicate(
    "user relationship should exist",
    ban.user.id !== undefined,
  );
  TestValidator.predicate(
    "moderator relationship should exist",
    ban.moderator.id !== undefined,
  );
}
