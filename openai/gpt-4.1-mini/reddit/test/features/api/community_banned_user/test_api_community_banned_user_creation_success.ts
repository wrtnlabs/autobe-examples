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

export async function test_api_community_banned_user_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the successful creation of a community banned user record by a moderator.
  // 1. Moderator joins to get authorized connection.
  // 2. Create a banned user record with random valid data using generator.
  // 3. Assert the creation response.
  // 4. Attempt to create the same banned user record again to test unique constraint rejection.
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Create a community banned user record
  const bannedUser =
    await generate_random_community_platform_moderator_community_banned_users_create_community_banned_user(
      moderatorConnection,
      {},
    );
  typia.assert(bannedUser);
  // Attempt to create the same banned user record again to test duplicate rejection
  await TestValidator.error("duplicate ban rejected", async () => {
    await generate_random_community_platform_moderator_community_banned_users_create_community_banned_user(
      moderatorConnection,
      {},
    );
  });
  // Missing API for verifying that a banned user cannot create posts or comments.
  // This is not implemented.
}
