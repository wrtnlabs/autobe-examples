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

/**
 * Test updating a community ban record with no changes (empty update).
 * The moderator submits an update request with no fields modified.
 * This scenario validates idempotency and that no unintended changes occur.
 * Confirm response returns the current ban record unchanged and authorization is correctly required.
 */
export async function test_api_community_ban_update_no_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and gets authorized
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {}, // ICommunityPlatformModerator.IJoin is empty type
    });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Use a stub banId (random UUID) as no ban creation API or retrieval is available.
  // This test focuses on the structure and authorization of the update call with empty body.
  const banId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // 3. Prepare empty update body for idempotency check
  const updateBody: ICommunityPlatformCommunityBan.IUpdate = {};
  // 4. Perform update with empty body once
  const banRecordBefore: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.community_bans.update(
      moderatorConnection,
      { banId, body: updateBody },
    );
  typia.assert(banRecordBefore);
  // 5. Perform update with empty body again
  const banRecordAfter: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.community_bans.update(
      moderatorConnection,
      { banId, body: updateBody },
    );
  typia.assert(banRecordAfter);
  // 6. Confirm that results are deeply equal
  TestValidator.equals(
    "ban record unchanged on empty update",
    banRecordAfter,
    banRecordBefore,
  );
  // 7. Verify unauthorized update attempt fails with HTTP 401
  await TestValidator.httpError(
    "unauthorized update attempt",
    401,
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
