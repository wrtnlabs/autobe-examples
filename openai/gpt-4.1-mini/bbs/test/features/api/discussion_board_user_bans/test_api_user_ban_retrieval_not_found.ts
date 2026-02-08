import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_user_bans_create } from "../../../generate/generate_random_discussion_board_administrator_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_user_ban_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that retrieving a non-existent user ban record returns 404 Not Found
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Step 2: Create a valid user ban to ensure the environment is prepared
  const validBan =
    await generate_random_discussion_board_administrator_user_bans_create(
      adminConnection,
      {},
    );
  typia.assert(validBan);
  // Step 3: Attempt to retrieve a non-existent ban record
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Expect 404 Not Found error when retrieving non-existent ban
  await TestValidator.httpError(
    "user ban retrieval with non-existent banId",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.userBans.at(
        adminConnection,
        {
          banId: nonExistentBanId,
        },
      );
    },
  );
}
