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

export async function test_api_community_ban_update_reason_only(
  connection: api.IConnection,
): Promise<void> {
  // Create a moderator connection and join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = moderatorAuth.token.access;
  // Create initial ban record by simulating or by hypothetical setup
  const banId = typia.random<string & tags.Format<"uuid">>();
  const initialReason = "Initial ban reason";
  const initialUnbannedAt: string | null = null;
  // Make initial update (simulate creation or ensure exists)
  const initialBanUpdateBody: ICommunityPlatformCommunityBan.IUpdate = {
    reason: initialReason,
    unbanned_at: initialUnbannedAt,
  };
  const initialBan =
    await api.functional.communityPlatform.moderator.community_bans.update(
      moderatorConnection,
      {
        banId,
        body: initialBanUpdateBody,
      },
    );
  typia.assert(initialBan);
  // Now update reason only, unbanned_at remains unchanged
  const updatedReason = "Updated ban reason";
  const updateBody: ICommunityPlatformCommunityBan.IUpdate = {
    reason: updatedReason,
    unbanned_at: initialUnbannedAt, // must be unchanged
  };
  const updatedBan =
    await api.functional.communityPlatform.moderator.community_bans.update(
      moderatorConnection,
      {
        banId,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);
  // Verify authorization enforced - attempt with unauthorized connection
  await TestValidator.error(
    "authorization required for updating ban",
    async () => {
      await api.functional.communityPlatform.moderator.community_bans.update(
        connection,
        {
          banId,
          body: updateBody,
        },
      );
    },
  );
}
