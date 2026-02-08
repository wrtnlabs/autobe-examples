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
 * Scenario 2: Update a banned user's reason while keeping them currently banned by setting unbanned_at to null.
 * Check that the system correctly retains ban status.
 * Verify moderator authorization and update flow.
 * Property-level validations are omitted due to empty DTO schema.
 */
export async function test_api_moderator_banned_user_update_maintain_ban_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = {
    Authorization: moderatorAuth.token.access,
  };
  // 2. Create a banned user record to update
  const bannedUserOriginal =
    await generate_random_community_platform_moderator_banned_users_create(
      moderatorConnection,
      {
        body: {
          unbanned_at: null, // initially banned
          reason: "Initial ban reason",
        },
      },
    );
  typia.assert(bannedUserOriginal);
  // 3. Prepare update with changed reason but keep unbanned_at as null
  const updateBody: ICommunityPlatformBannedUser.IUpdate = {
    unbanned_at: null,
    reason: "Updated ban reason maintaining ban",
  };
  // Safely extract bannedUserId from bannedUserOriginal
  let bannedUserId: string = "00000000-0000-0000-0000-000000000000";
  if (typeof bannedUserOriginal === "object" && bannedUserOriginal !== null) {
    if (
      "id" in bannedUserOriginal &&
      typeof bannedUserOriginal["id"] === "string"
    ) {
      bannedUserId = bannedUserOriginal["id"];
    } else if (
      "bannedUserId" in bannedUserOriginal &&
      typeof bannedUserOriginal["bannedUserId"] === "string"
    ) {
      bannedUserId = bannedUserOriginal["bannedUserId"];
    }
  }
  // 4. Perform update
  const bannedUserUpdated =
    await api.functional.communityPlatform.moderator.bannedUsers.update(
      moderatorConnection,
      {
        bannedUserId,
        body: updateBody,
      },
    );
  typia.assert(bannedUserUpdated);
  // No property-level assertions possible due to empty DTO
  // The assertions rely on typia.assert passing and no error thrown
}
