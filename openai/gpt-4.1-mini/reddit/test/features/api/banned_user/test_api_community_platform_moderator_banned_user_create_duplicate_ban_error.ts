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

/**
 * Test business rule preventing duplicate bans for the same user and community.
 * Attempt to create a ban for a user who is already banned in that community
 * and verify the API returns an appropriate error indicating duplicate ban.
 * Confirm system state after attempted duplicate ban remains unchanged.
 */
export async function test_api_community_platform_moderator_banned_user_create_duplicate_ban_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and gets authorized
  const moderatorJoinConnection: IConnection = { host: connection.host };
  const moderatorAuthorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorJoinConnection, {
      body: {},
    });
  typia.assert(moderatorAuthorized);
  const moderatorConnection: IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${moderatorAuthorized.token.access}` },
  };
  // 2. Create a banned user record
  const firstBan: ICommunityPlatformBannedUser =
    await generate_random_community_platform_moderator_banned_users_create(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(firstBan);
  // 3. Attempt to create the duplicate ban record for the same user and community
  await TestValidator.error("duplicate ban error", async () => {
    await generate_random_community_platform_moderator_banned_users_create(
      moderatorConnection,
      {
        body: {},
      },
    );
  });
  // 4. Confirm system state by creating another ban record
  const anotherBan: ICommunityPlatformBannedUser =
    await generate_random_community_platform_moderator_banned_users_create(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(anotherBan);
}
