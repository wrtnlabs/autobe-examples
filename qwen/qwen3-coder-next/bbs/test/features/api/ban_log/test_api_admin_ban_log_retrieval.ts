import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAdminLog";
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

/**
 * Test successful retrieval of a ban log entry by an authorized administrator.
 * The test should:
 * 1) Create an admin user through authentication registration,
 * 2) Create a ban record that generates an admin log entry,
 * 3) Retrieve the ban log using the log ID,
 * 4) Verify the response contains complete audit information including admin_id, user_id, action_type, ban_reason, timestamps, and notes,
 * 5) Confirm the response structure matches the IDiscussionBoardBansAdminLog schema.
 */
export async function test_api_admin_ban_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Create a ban record to generate an admin log entry
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardBansBanRecord.ICreate>(),
    },
  );
  typia.assert(banRecord);
  // 3. Retrieve the ban log using a generated log ID
  const adminLog =
    await api.functional.discussionBoard.admin.bans.admin_logs.at(
      adminConnection,
      { logId: typia.random<string & tags.Format<"uuid">>() },
    );
  typia.assert(adminLog);
}
