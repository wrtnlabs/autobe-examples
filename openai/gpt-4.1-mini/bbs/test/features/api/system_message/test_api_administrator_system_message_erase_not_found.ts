import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_system_message_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for attempting to delete a system message template that does not exist.
  // 1. Authenticate as an administrator by joining.
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Use a UUID that does not correspond to any existing system message template.
  const fakeSystemMessageId = typia.random<string & tags.Format<"uuid">>();
  // 3. Invoke the DELETE /discussionBoard/administrator/systemMessages/{id} API with this non-existent ID.
  //    Expect 404 Not Found error.
  await TestValidator.httpError(
    "should return 404 Not Found when deleting non-existent system message",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.systemMessages.erase(
        adminConnection,
        { id: fakeSystemMessageId },
      );
    },
  );
}
