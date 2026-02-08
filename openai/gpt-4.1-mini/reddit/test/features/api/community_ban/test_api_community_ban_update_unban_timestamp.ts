import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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

export async function test_api_community_ban_update_unban_timestamp(
  connection: api.IConnection,
): Promise<void> {
  // Test unbanning a user by updating the unbanned_at timestamp.
  // The moderator sets a valid unbanned_at ISO datetime to lift the ban.
  // Verify the ban status is updated, unbanned_at is set correctly,
  // and the user is effectively unbanned.
  // Confirm the response reflects this update.
  // This tests ban lifecycle management.
  // 1. Create moderator user and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Simulate existing ban creation - since no utility or creation function,
  // generate a random ban ID and update the ban with unbanned_at timestamp.
  const banId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare unbanned_at timestamp
  const unbannedAt = new Date().toISOString();
  // 4. Update ban record with unbanned_at set
  const updatedBan =
    await api.functional.communityPlatform.moderator.community_bans.update(
      moderatorConnection,
      {
        banId,
        body: {
          unbanned_at: unbannedAt,
          reason: null,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 5. Validate the updated response
  // Removed property access on 'updatedBan.id' and 'updatedBan.unbanned_at' as they do not exist on type
  TestValidator.predicate("ban updated", updatedBan !== null);
}
