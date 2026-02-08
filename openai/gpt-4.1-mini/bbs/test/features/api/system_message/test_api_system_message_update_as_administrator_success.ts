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

export async function test_api_system_message_update_as_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of an existing system message template by an administrator.
  // 1. Administrator authentication (join)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Prepare update payload for system message
  const id = typia.random<string & tags.Format<"uuid">>();
  const body = {
    code: RandomGenerator.alphabets(10),
    message_text: RandomGenerator.paragraph({ sentences: 3 }),
    message_type: RandomGenerator.pick(["error", "warning", "info"] as const),
  } satisfies IDiscussionBoardSystemMessage.IUpdate;
  // 3. Perform update
  const updatedMessage =
    await api.functional.discussionBoard.administrator.systemMessages.update(
      adminConnection,
      { id, body },
    );
  // 4. Validate response structure and content
  typia.assert(updatedMessage);
}