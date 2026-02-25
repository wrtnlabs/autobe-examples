import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
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
 * Test retrieving a non-existent system setting by administrator.
 *
 * This test:
 * 1. Registers and authorizes an administrator.
 * 2. Attempts to retrieve a system setting with a random non-existent UUID.
 * 3. Expects a 404 Not Found HTTP error response.
 */
export async function test_api_system_setting_retrieve_not_found_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "strongpassword1234",
    },
  });
  // 2. Prepare a non-existent UUID
  const nonExistentId = typia.random<string & typia.tags.Format<"uuid">>();
  // 3. Attempt to retrieve system setting by non-existent ID
  await TestValidator.httpError(
    "retrieve system setting with non-existent id should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.atSystemSetting(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
}
