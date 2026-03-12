import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_ban_records_create } from "../../../generate/generate_random_discussion_board_administrator_ban_records_create";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test that a banned member cannot submit an administrator privilege escalation request.
 *
 * Test Steps:
 * 1. Register a new member account
 * 2. Register and login as administrator
 * 3. Create a ban record for the member
 * 4. Attempt to submit an administrator request as the banned member
 * 5. Verify the request is rejected with an error
 */
export async function test_api_admin_request_banned_member_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Register and login as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 3. Create a ban record for the member
  const banRecord =
    await generate_random_discussion_board_administrator_ban_records_create(
      adminConnection,
      {
        body: {
          actor_type: "member",
          ban_reason: "Test ban for admin request rejection test",
          member_id: member.id,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Attempt to submit an administrator request as the banned member
  // This should be rejected because the member is banned
  await TestValidator.error(
    "banned member cannot submit admin request",
    async () => {
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {
          body: {
            reason: "I should be an administrator",
          } satisfies IDiscussionBoardAdminRequest.ICreate,
        },
      );
    },
  );
}
