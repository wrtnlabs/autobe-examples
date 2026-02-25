import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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
import { generate_random_discussion_board_administrator_system_messages_create_system_message } from "../../../generate/generate_random_discussion_board_administrator_system_messages_create_system_message";
import { prepare_random_discussion_board_system_message } from "../../../prepare/prepare_random_discussion_board_system_message";

export async function test_api_system_message_update_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssword1",
    },
  });
  // 2. Create a new system message template
  const originalMessage =
    await generate_random_discussion_board_administrator_system_messages_create_system_message(
      adminConnection,
      {
        body: {
          code: "ORIGINAL_CODE_" + RandomGenerator.alphabets(6),
          messageText: RandomGenerator.paragraph({ sentences: 3 }),
          messageType: "info",
        },
      },
    );
  typia.assert(originalMessage);
  // 3. Prepare update data with new code, messageText, and messageType
  const updateBody: IDiscussionBoardSystemMessage.IUpdate = {
    code: "UPDATED_CODE_" + RandomGenerator.alphabets(6),
    message_text: RandomGenerator.paragraph({ sentences: 4 }),
    message_type: "warning",
  };
  // 4. Perform update request
  const updatedMessage =
    await api.functional.discussionBoard.administrator.systemMessages.updateSystemMessage(
      adminConnection,
      { id: originalMessage.id, body: updateBody },
    );
  typia.assert(updatedMessage);
  // 5. Verify updated content
  TestValidator.equals(
    "system message id unchanged",
    updatedMessage.id,
    originalMessage.id,
  );
  TestValidator.equals(
    "system message code updated",
    updatedMessage.code,
    updateBody.code!,
  );
  TestValidator.equals(
    "system message text updated",
    updatedMessage.messageText,
    updateBody.message_text!,
  );
  TestValidator.equals(
    "system message type updated",
    updatedMessage.messageType,
    updateBody.message_type!,
  );
  TestValidator.predicate(
    "updatedAt timestamp updated",
    updatedMessage.updatedAt !== originalMessage.updatedAt,
  );
  TestValidator.equals(
    "createdAt timestamp unchanged",
    updatedMessage.createdAt,
    originalMessage.createdAt,
  );
  // 6. Attempt to update non-existent system message
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "update non-existent system message returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.systemMessages.updateSystemMessage(
        adminConnection,
        { id: nonExistentId, body: updateBody },
      );
    },
  );
}
