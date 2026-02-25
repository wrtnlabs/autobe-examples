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

export async function test_api_admin_ban_review_with_expired_temporary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for ban creation
  const adminConnection1: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 3. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  // 4. Create temporary ban with short expiration (1 second)
  const ban =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection1,
      {
        body: {
          user_id: user.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expires_at: new Date(Date.now() + 1000).toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(ban);
  // 5. Wait for ban to expire
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // 6. Create separate admin connection for ban retrieval
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 7. Retrieve ban record
  const retrievedBan =
    await api.functional.communityPlatform.admin.communities.bans.at(
      adminConnection2,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // 8. Validate ban status and expiration logic
  TestValidator.equals(
    "ban status should be expired",
    retrievedBan.status,
    "expired",
  );
  TestValidator.predicate(
    "expires_at should be in the past",
    new Date(retrievedBan.expires_at!) < new Date(),
  );
  TestValidator.equals(
    "revoked_at should be null",
    retrievedBan.revoked_at,
    null,
  );
  // 9. Validate relationship data persists
  TestValidator.equals(
    "community relationship should match",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "user relationship should match",
    retrievedBan.user.id,
    user.id,
  );
  TestValidator.predicate(
    "moderator relationship should exist",
    retrievedBan.moderator.id !== undefined,
  );
  TestValidator.equals(
    "ban reason should persist",
    retrievedBan.reason,
    ban.reason,
  );
}
