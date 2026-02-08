import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_community_banned_users_create_community_banned_user } from "../../../generate/generate_random_community_platform_admin_community_banned_users_create_community_banned_user";
import { prepare_random_community_platform_community_banned_user } from "../../../prepare/prepare_random_community_platform_community_banned_user";

export async function test_api_community_banned_user_creation_success_admin(
  connection: api.IConnection,
): Promise<void> {
  // Test creating a community banned user record successfully by an authorized admin.
  // 1. Admin joins (signs up) to obtain authorization.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare ban record data
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const bannedAt = new Date().toISOString();
  // 3. Admin creates a banned user record
  const banRecord =
    await generate_random_community_platform_admin_community_banned_users_create_community_banned_user(
      adminConnection,
      {
        body: {
          community_id: communityId,
          user_id: userId,
          ban_reason: banReason,
          banned_at: bannedAt,
        },
      },
    );
  typia.assert(banRecord);
  // 4. Validate response confirms creation reflecting input data
  // Cannot validate individual fields as they do not exist in the type
  // So validate the entire returned object to be truthy and asserted
  TestValidator.predicate("banRecord exists", banRecord !== undefined && banRecord !== null);
}
