import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_message_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // The authorize function does not update headers automatically on input connection, so create new one with token
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Prepare initial update to create a system message
  const initialUpdateBody: IDiscussionBoardSystemMessage.IUpdate = {
    code: `init_code_${RandomGenerator.alphabets(5)}`,
    message_text: RandomGenerator.paragraph({ sentences: 2 }),
    message_type: "info",
  };
  // Generate a valid UUID for system message ID
  const systemMessageId = typia.random<string & tags.Format<"uuid">>();
  const initialUpdated =
    await api.functional.discussionBoard.superAdministrator.systemMessages.updateSystemMessage(
      superAdminConnection,
      {
        id: systemMessageId,
        body: initialUpdateBody,
      },
    );
  typia.assert(initialUpdated);
  // 3. Prepare new update body with different values
  const newUpdateBody: IDiscussionBoardSystemMessage.IUpdate = {
    code: `updated_code_${RandomGenerator.alphabets(6)}`,
    message_text: RandomGenerator.paragraph({ sentences: 3 }),
    message_type: "warning",
  };
  // 4. Update the system message again with new data
  const updated =
    await api.functional.discussionBoard.superAdministrator.systemMessages.updateSystemMessage(
      superAdminConnection,
      {
        id: systemMessageId,
        body: newUpdateBody,
      },
    );
  // 5. Assert the updated response
  typia.assert(updated);
  // 6. Validate that the fields have been changed accordingly
  TestValidator.equals("code updated", updated.code, newUpdateBody.code);
  TestValidator.equals(
    "messageText updated",
    updated.messageText,
    newUpdateBody.message_text,
  );
  TestValidator.equals(
    "messageType updated",
    updated.messageType,
    newUpdateBody.message_type,
  );
  // 7. Validate timestamps: createdAt unchanged or earlier than updatedAt
  const createdAt = new Date(updated.createdAt).getTime();
  const updatedAt = new Date(updated.updatedAt).getTime();
  TestValidator.predicate("updatedAt >= createdAt", updatedAt >= createdAt);
  // 8. Ensure deletedAt is null (active)
  TestValidator.equals("deletedAt is null", updated.deletedAt, null);
}
