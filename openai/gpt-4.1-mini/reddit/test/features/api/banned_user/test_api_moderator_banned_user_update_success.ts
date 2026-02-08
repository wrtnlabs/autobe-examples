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

export async function test_api_moderator_banned_user_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of a banned user's reason and unban timestamp by an authorized moderator.
  // Validate proper authorization, updating reason text, and setting unbanned_at to a valid ISO 8601 timestamp indicating user is unbanned.
  // Confirm response contains updated ban record reflecting changes.
  // 1. Moderator joins the platform for authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {} satisfies ICommunityPlatformModerator.IJoin,
    });
  // Set Authorization header using returned token
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a banned user record to update
  let bannedUserRecord =
    await generate_random_community_platform_moderator_banned_users_create(
      moderatorConnection,
      {},
    );
  bannedUserRecord = typia.assert(bannedUserRecord);
  // 3. Prepare update data: new reason and unbanned_at timestamp
  const newReason = `Updated ban reason ${RandomGenerator.alphabets(10)}`;
  const unbannedAt = new Date().toISOString();
  const updateBody: ICommunityPlatformBannedUser.IUpdate = {
    reason: newReason,
    unbanned_at: unbannedAt,
  };
  // 4. Perform the update
  let updatedBanUser =
    await api.functional.communityPlatform.moderator.bannedUsers.update(
      moderatorConnection,
      {
        bannedUserId: typia.assert<string>((bannedUserRecord as any).id ?? ""),
        body: updateBody,
      },
    );
  updatedBanUser = typia.assert(updatedBanUser);
  // 5. Assert the updated response
  // The assertion above ensures proper typing
  // 6. Validate that the updated record has the new reason and unbanned_at
  TestValidator.equals(
    "updated reason",
    (updatedBanUser as any).reason,
    newReason,
  );
  TestValidator.equals(
    "updated unbanned_at",
    (updatedBanUser as any).unbanned_at,
    unbannedAt,
  );
}
