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

export async function test_api_admin_banned_user_update_reason_only(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. User join and login
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 3. Create community by user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. User subscribe to community
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      userConnection,
      {
        body: { communityCode: community.name },
      },
    );
  typia.assert(subscription);
  // 5. Admin create banned user record for the user in the community
  const bannedUser =
    await generate_random_community_platform_admin_banned_users_create_banned_user(
      adminConnection,
      {
        body: {
          community_platform_user_id: user.id,
          community_platform_community_id: community.id,
          banned_at: new Date().toISOString(),
          reason: "Initial ban reason",
          unbanned_at: null,
        },
      },
    );
  typia.assert(bannedUser);
  // 6. Admin updates only the reason of banned user record
  const updatedReason = "Updated ban reason";
  const updatedBannedUser =
    await api.functional.communityPlatform.admin.banned_users.update(
      adminConnection,
      {
        id: bannedUser.id,
        body: {
          reason: updatedReason,
          unbanned_at: null,
        },
      },
    );
  typia.assert(updatedBannedUser);
  // 7. Validate that updatedBannedUser fields updated_reason & timestamps
  TestValidator.equals(
    "reason updated",
    updatedBannedUser.reason,
    updatedReason,
  );
  TestValidator.predicate(
    "updatedAt is updated",
    new Date(updatedBannedUser.updatedAt).getTime() >=
      new Date(bannedUser.updatedAt).getTime(),
  );
  TestValidator.equals("id unchanged", updatedBannedUser.id, bannedUser.id);
  TestValidator.equals(
    "user.id unchanged",
    updatedBannedUser.user.id,
    bannedUser.user.id,
  );
  TestValidator.equals(
    "community.id unchanged",
    updatedBannedUser.community.id,
    bannedUser.community.id,
  );
  TestValidator.equals(
    "bannedAt unchanged",
    updatedBannedUser.bannedAt,
    bannedUser.bannedAt,
  );
  TestValidator.equals(
    "unbannedAt unchanged",
    updatedBannedUser.unbannedAt,
    bannedUser.unbannedAt,
  );
}
