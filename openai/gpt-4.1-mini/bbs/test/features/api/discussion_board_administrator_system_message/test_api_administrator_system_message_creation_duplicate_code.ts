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

export async function test_api_administrator_system_message_creation_duplicate_code(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Prepare duplicate code value
  const duplicateCode = `duplicate_code_test_${RandomGenerator.alphabets(6)}`;
  // 2. Create an initial system message to ensure a duplicate code exists
  const initialMessage =
    await generate_random_discussion_board_administrator_system_messages_create(
      adminConnection,
      {
        body: {
          code: duplicateCode,
          message_text: RandomGenerator.paragraph({ sentences: 3 }),
          message_type: "error", // Use one of the valid message types
        },
      },
    );
  typia.assert(initialMessage);
  // 3. Attempt to create another system message with the same code to test duplicate constraint
  await TestValidator.error(
    "creating system message with duplicate code should fail",
    async () => {
      await generate_random_discussion_board_administrator_system_messages_create(
        adminConnection,
        {
          body: {
            code: duplicateCode,
            message_text: RandomGenerator.paragraph({ sentences: 2 }),
            message_type: "error",
          },
        },
      );
    },
  );
}
