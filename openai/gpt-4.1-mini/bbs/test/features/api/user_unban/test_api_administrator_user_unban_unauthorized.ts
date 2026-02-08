import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { generate_random_discussion_board_administrator_user_unbans_create } from "../../../generate/generate_random_discussion_board_administrator_user_unbans_create";
import { prepare_random_discussion_board_user_unban } from "../../../prepare/prepare_random_discussion_board_user_unban";

export async function test_api_administrator_user_unban_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Attempt to create user unban record without administrator authorization.
  // Use base connection directly (no admin authorization)
  // Prepare a random user unban create payload
  const body = typia.random<IDiscussionBoardUserUnban.ICreate>();
  // Attempt to create user unban without authorization
  await TestValidator.httpError(
    "should reject unauthorized user unban creation",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.userUnbans.create(
        connection,
        { body },
      );
    },
  );
}
