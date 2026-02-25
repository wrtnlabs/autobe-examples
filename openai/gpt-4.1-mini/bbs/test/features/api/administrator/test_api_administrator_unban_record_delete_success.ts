import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_bans_create";
import { generate_random_discussion_board_administrator_administrator_unbans_create_unban } from "../../../generate/generate_random_discussion_board_administrator_administrator_unbans_create_unban";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";
import { prepare_random_discussion_board_user_unban } from "../../../prepare/prepare_random_discussion_board_user_unban";

export async function test_api_administrator_unban_record_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario: successful deletion of a user unban record by an authorized admin
  // 1. Authenticate as administrator (join)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Create a user ban record for a registered user
  const ban =
    await generate_random_discussion_board_administrator_administrator_bans_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(ban);
  // 3. Create a user unban record linked to the created ban
  const unban =
    await generate_random_discussion_board_administrator_administrator_unbans_create_unban(
      adminConnection,
      {
        body: {
          userBanId: ban.id,
          administratorId: adminAuthorized.id,
          reason: "Restore",
        },
      },
    );
  typia.assert(unban);
  // 4. Perform DELETE on /discussionBoard/administrator/administrator/unbans/{unbanId}
  await api.functional.discussionBoard.administrator.administrator.unbans.erase(
    adminConnection,
    { unbanId: unban.id },
  );
  // 5. Assert the unban record no longer exists
  // Since no direct GET endpoint for unban by ID is described, we validate by attempting deletion again which should error
  await TestValidator.error("unban record deleted successfully", async () => {
    await api.functional.discussionBoard.administrator.administrator.unbans.erase(
      adminConnection,
      { unbanId: unban.id },
    );
  });
}
