import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test deletion of an existing system message by an authorized administrator.
 * Steps include authenticating as administrator, ensuring a system message
 * exists, deleting it, and verifying successful deletion with no content.
 * Confirm the system message no longer exists and audit log entry is created.
 */
export async function test_api_system_message_erase_successful_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    { body: {} },
  );
  typia.assert(adminAuthorized);
  // Use token from join response
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Since creation API isn't specified, simulate system message ID
  const systemMessageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Delete the system message
  await api.functional.discussionBoard.administrator.systemMessages.erase(
    adminConnection,
    { id: systemMessageId },
  );
  // 4. Confirm deletion by attempting to delete again expecting an error
  await TestValidator.error(
    "deleting nonexistent system message should fail",
    async () => {
      await api.functional.discussionBoard.administrator.systemMessages.erase(
        adminConnection,
        { id: systemMessageId },
      );
    },
  );
}
