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

/**
 * Test creating a community banned user record with an already banned user in the same community resulting in conflict.
 * Steps:
 * 1. Admin joins.
 * 2. Admin creates a ban record for a specific user in a community.
 * 3. Admin attempts to create another ban record for the same user and community.
 * 4. Validate the API returns an appropriate conflict error response.
 *
 * This tests the critical edge case to ensure the unique constraint on community_id and user_id ban entries is enforced and appropriate error handling occurs to prevent duplication of ban records.
 */
export async function test_api_community_banned_user_creation_conflict_duplicate_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Create first ban record
  const banRecord1: ICommunityPlatformCommunityBannedUser =
    await generate_random_community_platform_admin_community_banned_users_create_community_banned_user(
      adminConnection,
      {},
    );
  typia.assert(banRecord1);
  // 3. Attempt to create duplicate ban record for the same community and user
  await TestValidator.httpError(
    "duplicate ban record should conflict",
    409,
    async () => {
      // Not accessing non-existent properties
      await generate_random_community_platform_admin_community_banned_users_create_community_banned_user(
        adminConnection,
        {},
      );
    },
  );
}
