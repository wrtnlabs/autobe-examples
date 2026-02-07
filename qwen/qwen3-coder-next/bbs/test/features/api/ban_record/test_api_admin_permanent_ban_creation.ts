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

export async function test_api_admin_permanent_ban_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = typia.random<IDiscussionBoardAdmin.IJoin>();
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  const adminLoginInput = typia.random<IDiscussionBoardAdmin.ILogin>();
  await authorize_admin_login(adminConnection, {
    body: adminLoginInput,
  });
  // 2. Create member to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinInput = typia.random<IDiscussionBoardMember.IJoin>();
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(memberAuthorized);
  const memberLoginInput = typia.random<IDiscussionBoardMember.ILogin>();
  await authorize_member_login(memberConnection, {
    body: memberLoginInput,
  });
  // 3. Admin creates permanent ban
  const banPayload: IDiscussionBoardBansBanRecord.ICreate = {
    user_id: "",
    reason: "Violated community guidelines permanently",
    start_time: new Date().toISOString(),
    end_time: null, // Permanent ban
  };
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: banPayload,
    },
  );
  typia.assert(banRecord);
  // 4. Validate ban record properties
  typia.assert(banRecord);
}
