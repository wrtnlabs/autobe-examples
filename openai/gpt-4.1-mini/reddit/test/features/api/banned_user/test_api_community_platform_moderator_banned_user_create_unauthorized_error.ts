import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_banned_users_create } from "../../../generate/generate_random_community_platform_moderator_banned_users_create";
import { prepare_random_community_platform_banned_user } from "../../../prepare/prepare_random_community_platform_banned_user";

export async function test_api_community_platform_moderator_banned_user_create_unauthorized_error(
  connection: api.IConnection,
): Promise<void> {
  // Test that a moderator cannot create a ban without proper authorization.
  // Attempt to create a ban request without authentication and verify the API rejects the request with an authorization error.
  // Confirm that no ban record is created in the database after unauthorized attempt.
  // 1. Use the base connection directly without authorization
  // 2. Compose a dummy ban create body with empty object since ICommunityPlatformBannedUser.ICreate is empty type, no properties to fill
  // 3. Call the bannedUsers.create API directly with base connection (unauthorized)
  // 4. Expect http error 401 (unauthorized)
  await TestValidator.httpError(
    "moderator banned user create unauthorized error",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.bannedUsers.create(
        connection,
        {
          body: {},
        },
      );
    },
  );
}
