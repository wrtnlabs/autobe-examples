import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_discussion_board_admin_ban_update_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a ban record to update using the utility function
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        ban_reason: "Initial ban reason for testing",
        discussion_board_member_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        administrator_id: admin.id,
      },
    },
  );
  typia.assert(banRecord);
  // 3. Update the ban record with a new reason
  const newReason = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBan = await api.functional.discussionBoard.admin.bans.update(
    adminConnection,
    {
      banId: banRecord.id,
      body: {
        ban_reason: newReason,
      } satisfies IDiscussionBoardBanRecord.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // 4. Validate the update
  TestValidator.equals("ban reason updated", updatedBan.ban_reason, newReason);
  TestValidator.notEquals(
    "ban reason changed from initial",
    updatedBan.ban_reason,
    banRecord.ban_reason,
  );
}
