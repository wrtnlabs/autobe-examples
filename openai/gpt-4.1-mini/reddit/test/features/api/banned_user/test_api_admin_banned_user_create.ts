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

export async function test_api_admin_banned_user_create(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully ban a user in a community by an authorized admin.
  {
    // 1. Admin join and login
    const adminJoinConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_admin_join(adminJoinConnection, {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
        password: "AdminPass123!",
        displayName: `Admin ${RandomGenerator.name()}`,
        bio: null,
        avatarUrl: null,
      },
    });
    typia.assert(adminAuth);
    const adminLoginConnection: api.IConnection = { host: connection.host };
    const adminLogin = await authorize_admin_login(adminLoginConnection, {
      body: {
        email: adminAuth.email,
        password: "AdminPass123!",
      },
    });
    typia.assert(adminLogin);
    const adminConnection: api.IConnection = { host: connection.host };
    adminConnection.headers = {
      Authorization: adminLogin.token.access,
    };
    // 2. User join and login
    const userJoinConnection: api.IConnection = { host: connection.host };
    const userAuth = await authorize_user_join(userJoinConnection, {
      body: {
        email: `user_${RandomGenerator.alphaNumeric(6)}@test.com`,
        password: "UserPass123!",
        username: `user${RandomGenerator.alphaNumeric(5)}`,
        displayName: `User ${RandomGenerator.name()}`,
        href: "https://example.com/signup",
        referrer: "https://example.com/referrer",
        ip: null,
      },
    });
    typia.assert(userAuth);
    const userLoginConnection: api.IConnection = { host: connection.host };
    const userLogin = await authorize_user_login(userLoginConnection, {
      body: {
        email: userAuth.email,
        password: "UserPass123!",
      },
    });
    typia.assert(userLogin);
    const userConnection: api.IConnection = { host: connection.host };
    userConnection.headers = {
      Authorization: userLogin.token.access,
    };
    // 3. Admin creates a community
    const community =
      await generate_random_community_platform_user_communities_create(
        userConnection,
        {
          body: {
            name: `community_${RandomGenerator.alphaNumeric(6)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            iconUrl: `https://example.com/icon_${RandomGenerator.alphaNumeric(4)}.png`,
          },
        },
      );
    typia.assert(community);
    // 4. User subscribes to the community
    const subscription =
      await generate_random_community_platform_user_subscriptions_create(
        userConnection,
        {
          body: {
            communityCode: community.name,
          },
        },
      );
    typia.assert(subscription);
    // 5. Admin bans the subscribed user
    const banRequestBody = {
      community_platform_user_id: userAuth.id,
      community_platform_community_id: community.id,
      banned_at: new Date().toISOString(),
      reason: `Violation of rules: ${RandomGenerator.paragraph({ sentences: 1 })}`,
      unbanned_at: null,
    } satisfies ICommunityPlatformBannedUser.ICreate;
    const bannedUser =
      await generate_random_community_platform_admin_banned_users_create_banned_user(
        adminConnection,
        {
          body: banRequestBody,
        },
      );
    typia.assert(bannedUser);
    TestValidator.equals(
      "banned user id matches",
      bannedUser.user.id,
      userAuth.id,
    );
    TestValidator.equals(
      "community id matches",
      bannedUser.community.id,
      community.id,
    );
    TestValidator.predicate(
      "bannedAt timestamp valid",
      Boolean(bannedUser.bannedAt),
    );
    TestValidator.equals(
      "ban reason matches",
      bannedUser.reason,
      banRequestBody.reason,
    );
    TestValidator.equals("unbannedAt is null", bannedUser.unbannedAt, null);
  }
  // Scenario 2: Attempt to ban a user who is already banned in the same community.
  {
    // Reuse admin and user from scenario 1. For isolation, create new user and subscribe
    const adminLoginConnection2: api.IConnection = { host: connection.host };
    const adminLogin2 = await authorize_admin_login(adminLoginConnection2, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPass123!",
      },
    });
    const adminConnection2: api.IConnection = { host: connection.host };
    adminConnection2.headers = {
      Authorization: adminLogin2.token.access,
    };
    const userJoinConnection2: api.IConnection = { host: connection.host };
    const userAuth2 = await authorize_user_join(userJoinConnection2, {
      body: {
        email: `user_${RandomGenerator.alphaNumeric(6)}@test.com`,
        password: "UserPass123!",
        username: `user${RandomGenerator.alphaNumeric(5)}`,
        displayName: `User ${RandomGenerator.name()}`,
        href: "https://example.com/signup",
        referrer: "https://example.com/referrer",
        ip: null,
      },
    });
    typia.assert(userAuth2);
    const userLoginConnection2: api.IConnection = { host: connection.host };
    const userLogin2 = await authorize_user_login(userLoginConnection2, {
      body: {
        email: userAuth2.email,
        password: "UserPass123!",
      },
    });
    typia.assert(userLogin2);
    const userConnection2: api.IConnection = { host: connection.host };
    userConnection2.headers = {
      Authorization: userLogin2.token.access,
    };
    const community2 =
      await generate_random_community_platform_user_communities_create(
        userConnection2,
        {
          body: {
            name: `community_${RandomGenerator.alphaNumeric(6)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            iconUrl: `https://example.com/icon_${RandomGenerator.alphaNumeric(4)}.png`,
          },
        },
      );
    typia.assert(community2);
    const subscription2 =
      await generate_random_community_platform_user_subscriptions_create(
        userConnection2,
        {
          body: {
            communityCode: community2.name,
          },
        },
      );
    typia.assert(subscription2);
    const banRequestBody2 = {
      community_platform_user_id: userAuth2.id,
      community_platform_community_id: community2.id,
      banned_at: new Date().toISOString(),
      reason: `Violation of rules: ${RandomGenerator.paragraph({ sentences: 1 })}`,
      unbanned_at: null,
    } satisfies ICommunityPlatformBannedUser.ICreate;
    const existingBan =
      await generate_random_community_platform_admin_banned_users_create_banned_user(
        adminConnection2,
        {
          body: banRequestBody2,
        },
      );
    typia.assert(existingBan);
    await TestValidator.error(
      "ban user already banned conflict error",
      async () =>
        await generate_random_community_platform_admin_banned_users_create_banned_user(
          adminConnection2,
          {
            body: banRequestBody2,
          },
        ),
    );
  }
  // Scenario 3: Attempt to ban a user in a non-existent community or with invalid user UUID.
  {
    const adminLoginConnection3: api.IConnection = { host: connection.host };
    const adminLogin3 = await authorize_admin_login(adminLoginConnection3, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPass123!",
      },
    });
    typia.assert(adminLogin3);
    const adminConnection3: api.IConnection = { host: connection.host };
    adminConnection3.headers = {
      Authorization: adminLogin3.token.access,
    };
    // Ban request with non-existent community id
    const invalidCommunityBan = {
      community_platform_user_id: typia.random<string & tags.Format<"uuid">>(),
      community_platform_community_id: typia.random<
        string & tags.Format<"uuid">
      >(),
      banned_at: new Date().toISOString(),
      reason: `Invalid community ban attempt: ${RandomGenerator.paragraph({ sentences: 1 })}`,
      unbanned_at: null,
    } satisfies ICommunityPlatformBannedUser.ICreate;
    await TestValidator.error(
      "ban user invalid community id error",
      async () =>
        await generate_random_community_platform_admin_banned_users_create_banned_user(
          adminConnection3,
          {
            body: invalidCommunityBan,
          },
        ),
    );
    // Ban request with invalid user id
    const invalidUserBan = {
      community_platform_user_id: typia.random<string & tags.Format<"uuid">>(),
      community_platform_community_id:
        invalidCommunityBan.community_platform_community_id,
      banned_at: new Date().toISOString(),
      reason: `Invalid user ban attempt: ${RandomGenerator.paragraph({ sentences: 1 })}`,
      unbanned_at: null,
    } satisfies ICommunityPlatformBannedUser.ICreate;
    await TestValidator.error(
      "ban user invalid user id error",
      async () =>
        await generate_random_community_platform_admin_banned_users_create_banned_user(
          adminConnection3,
          {
            body: invalidUserBan,
          },
        ),
    );
  }
}
