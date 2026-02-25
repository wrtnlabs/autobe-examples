import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_admin_communities_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_admin_communities_banned_users_create_banned_user";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_banned_user } from "../../../prepare/prepare_random_community_platform_community_banned_user";

export async function test_api_admin_community_banned_user_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform and obtains authorized admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInputPartial = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    displayName: typia.random<string>(),
  };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinInputPartial,
  });
  typia.assert(adminAuth);
  // 2. User joins the platform and obtains authorized user connection
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {});
  typia.assert(userAuth);
  // 3. The user creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: `test-community-${typia.random<string & tags.Format<"uuid">>()}`,
          description: "Community for E2E test",
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // 4. Admin bans the user from the community
  const banBody = typia.assert<
    {
      user_id: string;
      ban_reason: string;
      banned_at: string;
    }
  >({
    user_id: userAuth.id,
    ban_reason: "Violation of community rules.",
    banned_at: new Date().toISOString(),
  });
  const bannedUser =
    await generate_random_community_platform_admin_communities_banned_users_create_banned_user(
      adminConnection,
      {
        params: { communityId: community.id },
        body: banBody,
      },
    );
  typia.assert(bannedUser);
  // 5. Response validation
  TestValidator.equals(
    "community id matches",
    bannedUser.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned user id matches",
    bannedUser.user.id,
    userAuth.id,
  );
  TestValidator.equals(
    "ban reason matches",
    bannedUser.banReason,
    banBody.ban_reason,
  );
  TestValidator.predicate(
    "ban time recent",
    new Date(bannedUser.bannedAt).getTime() <= Date.now(),
  );
  TestValidator.predicate(
    "ban time valid ISO",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      bannedUser.bannedAt,
    ),
  );
  // 6. Uniqueness and cascading delete tests (simulated by additional request)
  await TestValidator.error("duplicate banning should fail", async () => {
    await generate_random_community_platform_admin_communities_banned_users_create_banned_user(
      adminConnection,
      {
        params: { communityId: community.id },
        body: banBody,
      },
    );
  });
}
