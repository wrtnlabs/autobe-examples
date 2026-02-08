import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_system_messages_create } from "../../../generate/generate_random_discussion_board_administrator_system_messages_create";
import { prepare_random_discussion_board_system_message } from "../../../prepare/prepare_random_discussion_board_system_message";

export async function test_api_administrator_system_message_creation_unauthorized_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Use the BASE connection without any authorization
  // 2. Prepare a random system message creation body
  // 3. Attempt to create a system message via the creation endpoint
  // 4. Expect the call to fail with a 401 Unauthorized error
  const body = typia.random<IDiscussionBoardSystemMessage.ICreate>();
  await TestValidator.httpError(
    "unauthorized system message creation",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.systemMessages.create(
        connection,
        { body },
      );
    },
  );
}
