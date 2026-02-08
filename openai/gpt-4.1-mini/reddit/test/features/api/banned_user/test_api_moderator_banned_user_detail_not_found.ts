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

export async function test_api_moderator_banned_user_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  /*
   * Test retrieving a banned user record with a bannedUserId that does not exist.
   * The system should respond with a 404 Not Found error indicating the banned user record is not found.
   * Confirm that the user is authorized as a moderator before making the request.
   * Verify that the error response follows the standard error format and includes a clear message.
   * This confirms the system's proper handling of invalid or nonexistent ban ID queries.
   */
  // 1. Moderator joins the platform and obtains authorization
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const authorizedModerator = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {}, // ICommunityPlatformModerator.IJoin is an empty object
    },
  );
  // Add authorization token to moderatorConnection
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorizedModerator.token.access}`,
  };
  // 2. Create a banned user record to ensure the system contains ban data
  //    This is optional but useful to verify authorization and data existence.
  await generate_random_community_platform_moderator_banned_users_create(
    moderatorConnection,
    {
      body: undefined, // Let the prepare function fill random data
    },
  );
  // 3. Attempt to retrieve a banned user record with a non-existent bannedUserId
  const fakeBannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 4. Expect a 404 error and validate error details
  await TestValidator.httpError(
    "Trying to fetch banned user details for a non-existent ID should fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.bannedUsers.at(
        moderatorConnection,
        {
          bannedUserId: fakeBannedUserId,
        },
      );
    },
  );
}
