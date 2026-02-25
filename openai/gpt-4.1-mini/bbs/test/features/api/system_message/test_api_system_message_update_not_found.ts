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

export async function test_api_system_message_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to update a non-existent system message template by superAdministrator. Expect a not found error response confirming system correctly handles invalid target IDs and prevents update.
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // 2. Prepare a non-existent ID (random UUID unlikely to exist)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update body data with some valid update fields
  const updateBody: IDiscussionBoardSystemMessage.IUpdate = {
    code: "nonexistent_code",
    message_text: "Attempt to update non-existent system message.",
    message_type: "error",
  };
  // 4. Attempt to update system message with non-existent ID and expect HTTP 404 error
  await TestValidator.httpError(
    "update non-existent system message returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemMessages.updateSystemMessage(
        superAdminConnection,
        {
          id: nonExistentId,
          body: updateBody,
        },
      );
    },
  );
}
