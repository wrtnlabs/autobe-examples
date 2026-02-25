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

export async function test_api_system_message_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdministrator = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Update connection headers with superAdministrator token
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = superAdministrator.token.access;
  // 2. Create a system message to be deleted
  // Note: No creation API or utility found, so we must use a random UUID to simulate existing ID
  const systemMessageId = typia.random<string & tags.Format<"uuid">>();
  // 3. Send DELETE request on systemMessages/{id} and expect no exceptions
  await api.functional.discussionBoard.superAdministrator.systemMessages.erase(
    superAdminConnection,
    { id: systemMessageId },
  );
  // 4. Verify that fetching the same system message afterwards returns 404 Not Found
  // Since GET API is not provided, emulate by calling erase again and expect HttpError 404
  await TestValidator.httpError(
    "fetching erased system message returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemMessages.erase(
        superAdminConnection,
        { id: systemMessageId },
      );
    },
  );
}
