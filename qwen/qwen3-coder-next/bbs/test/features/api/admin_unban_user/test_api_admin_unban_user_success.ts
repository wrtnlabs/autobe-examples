import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_admin_unban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins to get authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  typia.assert(admin);
  // 2. Create a ban record for the user to test unban functionality
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.discussionBoard.admin.bans.create(adminConnection, {
    body: {} satisfies IDiscussionBoardBansBanRecord.ICreate,
  });
  // 3. Verify ban is active before unban
  const retrievedBan = await api.functional.discussionBoard.admin.bans.at(
    adminConnection,
    {
      banRecordId: banRecordId,
    },
  );
  typia.assert(retrievedBan);
  // 4. Unban the user by deleting the ban record
  await api.functional.discussionBoard.admin.bans.erase(adminConnection, {
    banRecordId: banRecordId,
  });
  // 5. Verify the ban was successfully removed
  // Attempting to retrieve the deleted ban should return 404
  await TestValidator.error("ban record deleted", async () => {
    await api.functional.discussionBoard.admin.bans.at(adminConnection, {
      banRecordId: banRecordId,
    });
  });
}
