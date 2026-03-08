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

/**
 * Test unban functionality for discussion board administrators.
 * 1. Admin authenticates and bans a user
 * 2. Admin unbans the user with unban reason
 * 3. Verifies ban record shows unbanned status
 */
export async function test_api_discussion_board_admin_ban_unban_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin+test${RandomGenerator.alphaNumeric(6)}@example.com`,
      password: "TestPassword123!",
      display_name: "Test Admin",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a ban record for a test user
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
        discussion_board_member_id: testUserId,
        administrator_id: admin.id,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 3. Update ban record to unban the user
  const unbanReason = "User has been corrected and deserves a second chance";
  const updatedBanRecord =
    await api.functional.discussionBoard.admin.bans.update(adminConnection, {
      banId: banRecord.id,
      body: {
        ban_reason: banRecord.ban_reason,
        unban_reason: unbanReason,
      } satisfies IDiscussionBoardBanRecord.IUpdate,
    });
  typia.assert(updatedBanRecord);
  // 4. Validate the unban operation
  TestValidator.equals(
    "unban reason matches",
    updatedBanRecord.unban_reason,
    unbanReason,
  );
  TestValidator.predicate(
    "unbanned_at is set",
    () =>
      updatedBanRecord.unbanned_at !== null &&
      updatedBanRecord.unbanned_at !== undefined,
  );
  TestValidator.predicate("unbanned_at is after banned_at", () => {
    if (!updatedBanRecord.unbanned_at) return false;
    return (
      new Date(updatedBanRecord.unbanned_at).getTime() >=
      new Date(updatedBanRecord.banned_at).getTime()
    );
  });
  TestValidator.equals(
    "ban reason preserved",
    updatedBanRecord.ban_reason,
    banRecord.ban_reason,
  );
}
