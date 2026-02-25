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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

/**
 * Test the successful retrieval of a ban record by an admin within a specific community.
 * Admin authenticates via join, creates a community, creates a user (to be banned), bans the user,
 * then retrieves the detailed ban record to verify all fields match expected values.
 * Validate the returned ban includes complete details: id, reason, status, banned_at, expires_at (null for permanent),
 * community and user relationships, moderator who imposed the ban, and timestamps.
 * This tests the basic success path where admin has full platform access to view any community's ban records.
 */
export async function test_api_admin_ban_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 4. Create ban
  const ban =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: user.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Retrieve ban
  const retrievedBan =
    await api.functional.communityPlatform.admin.communities.bans.at(
      adminConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // 6. Validate ban details
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals("ban reason matches", retrievedBan.reason, ban.reason);
  TestValidator.equals("ban status is active", retrievedBan.status, "active");
  TestValidator.predicate(
    "banned_at timestamp exists",
    retrievedBan.banned_at !== null,
  );
  TestValidator.equals(
    "expires_at is null for permanent ban",
    retrievedBan.expires_at,
    null,
  );
  TestValidator.equals(
    "revoked_at is null for active ban",
    retrievedBan.revoked_at,
    null,
  );
  TestValidator.equals(
    "revoke_reason is null for active ban",
    retrievedBan.revoke_reason,
    null,
  );
  TestValidator.equals(
    "community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals("user id matches", retrievedBan.user.id, user.id);
  TestValidator.predicate(
    "moderator exists",
    retrievedBan.moderator.id !== null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedBan.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedBan.updated_at !== null,
  );
}
