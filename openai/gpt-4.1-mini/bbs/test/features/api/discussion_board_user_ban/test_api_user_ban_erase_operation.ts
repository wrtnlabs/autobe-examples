import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_user_ban_erase_operation(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully erase existing ban record
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Apply token to connection
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // Generate ban record for user
  const banRecord =
    await generate_random_discussion_board_super_administrator_administrator_bans_create(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(banRecord);
  // Erase the ban record
  await api.functional.discussionBoard.superAdministrator.administrator.bans.erase(
    superAdminConnection,
    { banId: banRecord.id },
  );
  // Verify ban record is removed: try to erase again should throw error
  await TestValidator.error("ban record should be deleted", async () => {
    await api.functional.discussionBoard.superAdministrator.administrator.bans.erase(
      superAdminConnection,
      { banId: banRecord.id },
    );
  });
  // Scenario 2: Attempt to erase with non-existent banId
  const fakeBanId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("banId not found error", async () => {
    await api.functional.discussionBoard.superAdministrator.administrator.bans.erase(
      superAdminConnection,
      { banId: fakeBanId },
    );
  });
}
