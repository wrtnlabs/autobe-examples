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
import { generate_random_discussion_board_super_administrator_system_messages_create } from "../../../generate/generate_random_discussion_board_super_administrator_system_messages_create";
import { prepare_random_discussion_board_system_message } from "../../../prepare/prepare_random_discussion_board_system_message";

export async function test_api_super_administrator_system_message_create(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful creation of a new system message template by a super administrator.
  // Scenario 2: Attempt to create a system message with a duplicate code.
  // 1. Join as super administrator to authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // Update superAdminConnection with token for authenticated requests
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create first system message with valid unique code
  // Prepare message data
  const codeBase = `SYS_MSG_${RandomGenerator.alphaNumeric(8)}`;
  const validMessageType = RandomGenerator.pick([
    "error",
    "warning",
    "info",
  ] as const);
  const messageText = RandomGenerator.paragraph({ sentences: 2 });
  const firstMessageBody = {
    code: codeBase,
    message_text: messageText,
    message_type: validMessageType,
  } as const;
  // Insert first message
  const firstResponseRaw =
    await generate_random_discussion_board_super_administrator_system_messages_create(
      superAdminConnection,
      { body: firstMessageBody },
    );
  // Perform runtime type assertion on the response to ensure it has the expected properties
  const firstResponse = typia.assert<{
    code: string;
    message_text: string;
    message_type: "error" | "warning" | "info";
    created_at: string;
    updated_at: string;
    deleted_at: null | string;
  }>(firstResponseRaw);
  // Validate response properties
  TestValidator.equals(
    "code matches",
    firstResponse.code,
    firstMessageBody.code,
  );
  TestValidator.equals(
    "message_text matches",
    firstResponse.message_text,
    firstMessageBody.message_text,
  );
  TestValidator.equals(
    "message_type matches",
    firstResponse.message_type,
    firstMessageBody.message_type,
  );
  // Check created_at and updated_at exist and are ISO strings
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof firstResponse.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(firstResponse.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof firstResponse.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(firstResponse.updated_at),
  );
  TestValidator.equals("deleted_at is null or string", firstResponse.deleted_at, null);
  // 3. Attempt to create another system message with same code to test duplicate rejection
  await TestValidator.error("duplicate code error", async () => {
    await generate_random_discussion_board_super_administrator_system_messages_create(
      superAdminConnection,
      {
        body: {
          code: codeBase, // duplicate code
          message_text: RandomGenerator.paragraph({ sentences: 3 }),
          message_type: RandomGenerator.pick([
            "error",
            "warning",
            "info",
          ] as const),
        },
      },
    );
  });
}
