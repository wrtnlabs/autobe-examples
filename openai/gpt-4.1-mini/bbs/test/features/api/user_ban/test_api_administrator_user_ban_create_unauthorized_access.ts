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

export async function test_api_administrator_user_ban_create_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test checks that unauthorized access to the user ban creation endpoint is rejected.
  // Use the base connection directly, no authorization headers set
  // Prepare a fake ban creation body (empty object since IDiscussionBoardUserBan.ICreate has no documented props)
  const body = {} satisfies IDiscussionBoardUserBan.ICreate;
  // Attempt to create a ban record without any authorization
  // Expect the operation to throw an authorization error
  await TestValidator.error("unauthorized ban creation", async () => {
    await generate_random_discussion_board_administrator_user_bans_create(
      connection,
      {
        body,
      },
    );
  });
}
