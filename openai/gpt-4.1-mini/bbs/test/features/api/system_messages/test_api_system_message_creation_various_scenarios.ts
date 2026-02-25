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

export async function test_api_system_message_creation_various_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminPass1234!",
    },
  });
  typia.assert(adminAuth);
  // 2. Successful system message creation with unique code
  const systemMessageBody: IDiscussionBoardSystemMessage.ICreate = {
    code: "SYSMSG_CODE_" + RandomGenerator.alphaNumeric(6),
    messageText: RandomGenerator.paragraph({ sentences: 2 }),
    messageType: "info",
  };
  const createdMessage =
    await generate_random_discussion_board_administrator_system_messages_create_system_message(
      adminConnection,
      { body: systemMessageBody },
    );
  typia.assert(createdMessage);
  TestValidator.equals(
    "created message code matches",
    createdMessage.code,
    systemMessageBody.code,
  );
  TestValidator.equals(
    "created message text matches",
    createdMessage.messageText,
    systemMessageBody.messageText,
  );
  TestValidator.equals(
    "created message type matches",
    createdMessage.messageType,
    systemMessageBody.messageType,
  );
  // 3. Attempt creation with duplicate code - must error
  await TestValidator.error("duplicate code error", async () => {
    await generate_random_discussion_board_administrator_system_messages_create_system_message(
      adminConnection,
      { body: { ...systemMessageBody } },
    );
  });
  // 4. Attempt creation without authentication - expect forbidden error
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated creation forbidden",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.systemMessages.createSystemMessage(
        unauthConnection,
        {
          body: {
            code: "UNAUTH_SYSMSG_" + RandomGenerator.alphaNumeric(6),
            messageText: RandomGenerator.paragraph({ sentences: 2 }),
            messageType: "warning",
          } satisfies IDiscussionBoardSystemMessage.ICreate,
        },
      );
    },
  );
}
