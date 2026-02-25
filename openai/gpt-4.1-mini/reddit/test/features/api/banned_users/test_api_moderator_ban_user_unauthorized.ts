import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_moderator_banned_users_create_banned_user";
import { prepare_random_community_platform_banned_user } from "../../../prepare/prepare_random_community_platform_banned_user";

export async function test_api_moderator_ban_user_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Unauthorized user attempts to ban a user
  // - Attempt to ban user without authentication
  // - Attempt to ban user as regular user (non-moderator)
  // - Validate HTTP 403 Forbidden and error messages indicate insufficient permissions
  // - No banned user record created
  // 1. Create unauthenticated connection (no auth headers)
  const unauthConnection: api.IConnection = { host: connection.host };
  // Prepare ban user body with random but valid values
  const banBody = typia.random<ICommunityPlatformBannedUser.ICreate>();
  // 2. Attempt to ban user without authentication
  await TestValidator.httpError(
    "ban user without auth returns 403",
    403,
    async () =>
      await api.functional.communityPlatform.moderator.banned_users.createBannedUser(
        unauthConnection,
        { body: banBody },
      ),
  );
  // 3. Create a regular user connection (simulate regular user without moderator rights)
  const regularUserConnection: api.IConnection = { host: connection.host };
  // 4. Attempt to ban user as regular user (non-moderator)
  await TestValidator.httpError(
    "ban user as regular non-moderator returns 403",
    403,
    async () =>
      await api.functional.communityPlatform.moderator.banned_users.createBannedUser(
        regularUserConnection,
        { body: banBody },
      ),
  );
}
