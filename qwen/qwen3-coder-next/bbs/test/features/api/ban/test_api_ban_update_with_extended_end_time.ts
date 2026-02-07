import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_ban_update_with_extended_end_time(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Login both users to establish connections
  await authorize_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  await authorize_member_login(memberConnection, {
    body: typia.random<IDiscussionBoardMember.ILogin>(),
  });
  // Create a temporary ban record with past end time
  const pastDate = new Date();
  pastDate.setHours(pastDate.getHours() - 1);
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        user_id: "sample-user-id",
        reason: "Violation of community guidelines",
        start_time: pastDate.toISOString(),
        end_time: pastDate.toISOString(),
      } satisfies IDiscussionBoardBansBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // Update the ban record to extend the end time
  const updatedBanRecord =
    await api.functional.discussionBoard.admin.bans.update(adminConnection, {
      banRecordId: "sample-ban-record-id",
      body: {
        reason: "Violation of community guidelines - extended",
        end_time: futureDate.toISOString(),
      } satisfies IDiscussionBoardBansBanRecord.IUpdate,
    });
  typia.assert(updatedBanRecord);
  // Basic validation that the update operation succeeded
  TestValidator.predicate(
    "ban update completed",
    updatedBanRecord !== null && updatedBanRecord !== undefined,
  );
}
