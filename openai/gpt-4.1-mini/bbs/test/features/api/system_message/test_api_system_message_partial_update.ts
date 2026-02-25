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

export async function test_api_system_message_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SuperSecret123!",
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/referrer",
        ip: null,
      },
    },
  );
  superAdminConnection.headers = { Authorization: superAdmin.token.access };
  // 2. Create an initial system message to update - We simulate an existing message using random
  const originalMessage = typia.random<IDiscussionBoardSystemMessage>();
  // 3. Prepare the partial update body - only update message_text
  const newMessageText =
    "Updated system message content for partial update test.";
  const updateBody: IDiscussionBoardSystemMessage.IUpdate = {
    message_text: newMessageText,
  };
  // 4. Execute partial update using the utility function
  const updatedMessage =
    await api.functional.discussionBoard.superAdministrator.systemMessages.updateSystemMessage(
      superAdminConnection,
      {
        id: originalMessage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMessage);
  // 5. Validate that only message_text is changed and other fields remain unchanged
  TestValidator.equals("id unchanged", updatedMessage.id, originalMessage.id);
  TestValidator.equals(
    "code unchanged",
    updatedMessage.code,
    originalMessage.code,
  );
  TestValidator.equals(
    "message_text updated",
    updatedMessage.messageText,
    newMessageText,
  );
  TestValidator.equals(
    "message_type unchanged",
    updatedMessage.messageType,
    originalMessage.messageType,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updatedMessage.createdAt,
    originalMessage.createdAt,
  );
  TestValidator.equals(
    "updatedAt unchanged",
    updatedMessage.updatedAt,
    originalMessage.updatedAt,
  );
  TestValidator.equals(
    "deletedAt unchanged",
    updatedMessage.deletedAt,
    originalMessage.deletedAt,
  );
}
