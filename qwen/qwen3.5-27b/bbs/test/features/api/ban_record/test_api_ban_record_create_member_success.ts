import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test the primary success path for banning a member account.
 *
 * This test validates that an authenticated administrator can successfully
 * create a ban record for a member who has violated platform policies.
 * The test verifies:
 * 1. Administrator authentication is required and validated
 * 2. The ban record is created with actor_type set to 'member'
 * 3. The ban reason is stored as provided
 * 4. The banned_at timestamp is recorded
 * 5. The unbanned_at field is null (indicating active ban)
 * 6. The bannedBy field contains the administrator who imposed the ban
 * 7. The bannedUser field contains the member's summary information
 * 8. The bannedUser.banned flag is true
 */
export async function test_api_ban_record_create_member_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create and authenticate member (to be banned)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 3. Administrator creates ban record for the member
  const banRecord =
    await generate_random_discussion_board_administrator_ban_records_create(
      adminConnection,
      {
        body: {
          actor_type: "member",
          member_id: memberAuth.id,
          ban_reason:
            "Violated community guidelines: Posted inappropriate content and harassed other members",
        },
      },
    );
  typia.assert(banRecord);
  // 4. Validate ban record business logic
  TestValidator.equals("actor_type is member", banRecord.actor_type, "member");
  TestValidator.equals(
    "ban_reason is stored",
    banRecord.ban_reason,
    "Violated community guidelines: Posted inappropriate content and harassed other members",
  );
  TestValidator.predicate(
    "banned_at timestamp exists",
    banRecord.banned_at !== null && banRecord.banned_at !== undefined,
  );
  TestValidator.equals(
    "unbanned_at is null (active ban)",
    banRecord.unbanned_at,
    null,
  );
  TestValidator.equals(
    "bannedBy is the administrator",
    banRecord.bannedBy.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "bannedUser is the member",
    banRecord.bannedUser.id,
    memberAuth.id,
  );
  // Narrow the type to IDiscussionBoardMember.ISummary since actor_type is 'member'
  const bannedUser = typia.assert<IDiscussionBoardMember.ISummary>(banRecord.bannedUser);
  TestValidator.predicate(
    "bannedUser.banned flag is true",
    bannedUser.banned === true,
  );
}