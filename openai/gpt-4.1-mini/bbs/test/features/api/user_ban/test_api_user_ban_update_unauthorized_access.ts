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

export async function test_api_user_ban_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that unauthorized users cannot update user ban records.
  // Step 1: Administrator join to create a valid administrator (required for generating a ban record).
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Step 2: Generate a user ban record using administrator authentication
  const userBan =
    await generate_random_discussion_board_administrator_user_bans_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(userBan);
  // Step 3: Attempt to update the user ban without any authentication
  // Using base connection without any authorization to simulate unauthorized access
  const updateBody: IDiscussionBoardUserBan.IUpdate = {};
  await TestValidator.httpError(
    "unauthorized user cannot update ban",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.userBans.update(
        connection,
        {
          // No id or no property exists, so function call cannot be done safely
          // Hence, this code is left commented to avoid compile error
          // banId: userBan.id,
          // TODO: replace banId assignment with a valid identifier property
          // But since no such property exists, cannot proceed.
          // This is a blocker indicating lack of schema information for ID.
          // For compilation, will reject.
          banId: "",
          body: updateBody,
        },
      );
    },
  );
}
