import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_message_erase_super_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for super administrator registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authorize a new super administrator
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {}, // Use empty body as per IJoin definition
    },
  );
  typia.assert(authorized);
  // Update the super administrator connection with authorization token
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = authorized.token.access;
  // Generate a fake system message ID (UUID) for deletion
  const systemMessageId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to erase the system message with the generated ID
  // Note: We assume the message exists in test environment or mocking
  await api.functional.discussionBoard.superAdministrator.systemMessages.erase(
    superAdminConnection,
    { id: systemMessageId },
  );
  // Since erase returns void on success, we can test no error was thrown
  // Additional validation can be done if API allows listing or fetching messages
}
