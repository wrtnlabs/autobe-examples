import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
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
import { generate_random_community_platform_admin_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_admin_banned_users_create_banned_user";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_banned_user } from "../../../prepare/prepare_random_community_platform_banned_user";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_admin_banned_users_erase_banned_user_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully unban a user by deleting an existing banned user record
  {
    // Admin join and login
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {});
    typia.assert(admin);
    // User join and login
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {});
    typia.assert(user);
    // Create a community as the user
    const community =
      await generate_random_community_platform_user_communities_create(
        userConnection,
        { body: {} },
      );
    typia.assert(community);
    // Subscribe user to the community
    const subscription =
      await generate_random_community_platform_user_subscriptions_create(
        userConnection,
        { body: { communityCode: community.name } },
      );
    typia.assert(subscription);
    // Ban the user in the community
    const bannedUser =
      await generate_random_community_platform_admin_banned_users_create_banned_user(
        adminConnection,
        {
          body: {
            community_platform_user_id: user.id,
            community_platform_community_id: community.id,
            banned_at: new Date().toISOString(),
            reason: "Violation of rules",
          },
        },
      );
    typia.assert(bannedUser);
    // Delete the banned user record
    await api.functional.communityPlatform.admin.banned_users.eraseBannedUser(
      adminConnection,
      { id: bannedUser.id },
    );
    // Try to delete again to confirm deletion (should error 404)
    await TestValidator.httpError(
      "delete already deleted banned user",
      404,
      async () => {
        await api.functional.communityPlatform.admin.banned_users.eraseBannedUser(
          adminConnection,
          { id: bannedUser.id },
        );
      },
    );
  }
  // Scenario 2: Delete banned user record with non-existent id
  {
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {});
    const fakeId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "delete non-existent banned user",
      404,
      async () => {
        await api.functional.communityPlatform.admin.banned_users.eraseBannedUser(
          adminConnection,
          { id: fakeId },
        );
      },
    );
  }
  // Scenario 3: Unauthorized deletion attempt
  {
    // User join and login
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {});
    // Try to delete with user connection
    const randomId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "unauthorized delete attempt",
      [401, 403],
      async () => {
        await api.functional.communityPlatform.admin.banned_users.eraseBannedUser(
          userConnection,
          { id: randomId },
        );
      },
    );
  }
}
