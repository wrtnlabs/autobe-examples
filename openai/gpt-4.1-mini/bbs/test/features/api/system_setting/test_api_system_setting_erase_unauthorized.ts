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

export async function test_api_system_setting_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // We attempt to delete a system setting without super administrator authentication.
  // Steps:
  // 1. Use the base connection without JWT tokens for auth
  // 2. Call the erase endpoint with a random UUID as system setting id
  // 3. Expect an HttpError 401 or 403, indicating unauthorized access
  // 4. No system setting changes expected (cannot check DB here, but this validates authorization failure)
  // Prepare random UUID for system setting id
  const testId = typia.random<string & tags.Format<"uuid">>();
  // Attempt deletion without authentication
  await TestValidator.httpError(
    "unauthorized access to system setting erase",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemSettings.erase(
        connection,
        {
          id: testId,
        },
      );
    },
  );
}
