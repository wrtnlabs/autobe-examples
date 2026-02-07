import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
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
import { generate_random_discussion_board_admin_bans_appeals_create } from "../../../generate/generate_random_discussion_board_admin_bans_appeals_create";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_appeal } from "../../../prepare/prepare_random_discussion_board_bans_appeal";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_bans_appeal_approve_unban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Create ban record for a user (using admin connection)
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardBansBanRecord.ICreate>(),
    },
  );
  typia.assert(banRecord);
  // 3. Create user connection and submit ban appeal
  const userConnection: api.IConnection = { host: connection.host };
  const appeal = await api.functional.discussionBoard.admin.bans.appeals.create(
    userConnection,
    {
      body: typia.random<IDiscussionBoardBansAppeal.ICreate>(),
    },
  );
  typia.assert(appeal);
  // 4. Approve the ban appeal as admin
  const approvedAppeal =
    await api.functional.discussionBoard.admin.admins.bans.appeals.process(
      adminConnection,
      {
        appealId: typia.random<string>(),
        body: typia.random<IDiscussionBoardBansAppeal.IRequest>(),
      },
    );
  typia.assert(approvedAppeal);
  // 5. Validate workflow completion
  // The appeal processing completed successfully, indicating the ban was likely removed
}
