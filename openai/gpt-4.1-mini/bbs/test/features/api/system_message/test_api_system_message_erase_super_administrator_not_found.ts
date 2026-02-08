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

export async function test_api_system_message_erase_super_administrator_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the case when a super administrator attempts to delete a system message template that does not exist.
  // It ensures the system responds appropriately with a 404 Not Found error.
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // Update the connection with authorization header
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Attempt to delete a non-existent system message ID
  const nonExistentSystemMessageId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Expect a 404 Not Found error
  await TestValidator.httpError(
    "super administrator deletes non-existent system message",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemMessages.erase(
        superAdminConnection,
        { id: nonExistentSystemMessageId },
      );
    },
  );
}
