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
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_unban_retrieval_soft_deleted_record(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of a soft-deleted user unban record by id with admin auth
  // Prepare an administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // Use admin connection for subsequent calls
  // Prepare a user ban record to link to unban (prerequisite)
  const userBan =
    await generate_random_discussion_board_administrator_administrator_bans_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(userBan);
  // Since no direct api or utility for creating soft-deleted unban, simulate
  // a soft-deleted unban id.
  // NOTE: This UUID does not necessarily correspond to an actual soft deleted record,
  // but simulates retrieval of an inaccessible (deleted) resource.
  const fakeSoftDeletedUnbanId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the soft deleted unban record by id
  await TestValidator.httpError(
    "retrieving soft-deleted unban record should fail",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administrator.unbans.at(
        adminConnection,
        { unbanId: fakeSoftDeletedUnbanId },
      );
    },
  );
}
