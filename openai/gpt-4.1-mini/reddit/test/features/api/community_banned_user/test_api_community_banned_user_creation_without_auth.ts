import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
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
import { generate_random_community_platform_moderator_community_banned_users_create_community_banned_user } from "../../../generate/generate_random_community_platform_moderator_community_banned_users_create_community_banned_user";
import { prepare_random_community_platform_community_banned_user } from "../../../prepare/prepare_random_community_platform_community_banned_user";

export async function test_api_community_banned_user_creation_without_auth(
  connection: api.IConnection,
): Promise<void> {
  // Test authorization enforcement by unauthenticated request
  // Prepare a sample create body using typia random for the banned user record (ICreate)
  const body = typia.random<ICommunityPlatformCommunityBannedUser.ICreate>();
  // Try to send POST request without moderator or admin auth
  await TestValidator.httpError(
    "unauthorized creation of community banned user",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.community_banned_users.createCommunityBannedUser(
        connection,
        { body },
      );
    },
  );
}
