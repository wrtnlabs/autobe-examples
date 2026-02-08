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

export async function test_api_system_message_retrieve_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Successful retrieval of a system message by a valid administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  const validSystemMessageId = typia.random<string & tags.Format<"uuid">>();
  const systemMessage =
    await api.functional.discussionBoard.administrator.systemMessages.at(
      adminConnection,
      { id: validSystemMessageId },
    );
  typia.assert(systemMessage);
  // Removed invalid access to systemMessage.id
  // 2. Retrieval of a soft-deleted system message by an authorized administrator
  // Prepare a realistic soft-deleted system message UUID
  const softDeletedSystemMessageId = typia.random<
    string & tags.Format<"uuid">
  >();
  const softDeletedSystemMessage =
    await api.functional.discussionBoard.administrator.systemMessages.at(
      adminConnection,
      { id: softDeletedSystemMessageId },
    );
  typia.assert(softDeletedSystemMessage);
  // Removed invalid access to softDeletedSystemMessage.id
  // 3. Unauthorized access attempt to retrieve a system message without authentication
  // Using base connection without Authorization header
  const unauthorizedSystemMessageId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "Unauthorized system message retrieve attempt",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.systemMessages.at(
        connection,
        { id: unauthorizedSystemMessageId },
      );
    },
  );
}
