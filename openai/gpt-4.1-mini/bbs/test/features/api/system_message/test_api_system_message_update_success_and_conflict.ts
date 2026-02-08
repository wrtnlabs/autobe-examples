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

export async function test_api_system_message_update_success_and_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator using join
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(authorized);
  // Create a connection with authorization header
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // Generate random UUID for system message id
  const systemMessageId = typia.random<string & tags.Format<"uuid">>();
  // Update system message with empty body (since no properties defined)
  const updatedMessage =
    await api.functional.discussionBoard.superAdministrator.systemMessages.update(
      superAdminConnection,
      {
        id: systemMessageId,
        body: {},
      },
    );
  typia.assert(updatedMessage);
  // Attempt conflict by updating same id again causing conflict
  await TestValidator.error("conflict error on duplicate update", async () => {
    await api.functional.discussionBoard.superAdministrator.systemMessages.update(
      superAdminConnection,
      {
        id: systemMessageId,
        body: {},
      },
    );
  });
}
