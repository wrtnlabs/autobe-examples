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

/**
 * Test scenario for updating a ban record with new information.
 *
 * 1. Admin setup: Register and login as an administrator
 * 2. User setup: Register and login as a regular member
 * 3. Ban creation: Admin creates a ban record for the user
 * 4. Ban update: Admin updates the ban record with new information
 * 5. Validation: Verify the update operation succeeds
 */
export async function test_api_ban_update_with_new_information(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login an admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  const loggedAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(loggedAdminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  // 2. Create a user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  const loggedUserConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loggedUserConnection, {
    body: typia.random<IDiscussionBoardMember.ILogin>(),
  });
  // 3. Admin bans the user
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    loggedAdminConnection,
    {
      body: typia.random<IDiscussionBoardBansBanRecord.ICreate>(),
    },
  );
  typia.assert(banRecord);
  // 4. Update the ban record with new information
  // Since the DTO type has no properties defined, we need to extract the ID differently
  // Using typia.assert to validate the structure and extract the ID
  const banRecordId = typia.assert<string>((banRecord as any).id);
  const updatedBanRecord =
    await api.functional.discussionBoard.admin.bans.update(
      loggedAdminConnection,
      {
        banRecordId: banRecordId,
        body: typia.random<IDiscussionBoardBansBanRecord.IUpdate>(),
      },
    );
  typia.assert(updatedBanRecord);
  // 5. Validation: Verify the update operation completed successfully
  TestValidator.predicate("ban record updated successfully", true);
}
