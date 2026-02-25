import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_setting_retrieval_not_found_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator account and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Update the connection authorization header internally
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Attempt to retrieve a system setting with a random UUID that does not exist
  const nonExistingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect a 404 Not Found HttpError when trying to fetch the system setting
  await TestValidator.httpError(
    "should return 404 Not Found for non-existing system setting",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemSettings.atSystemSetting(
        superAdminConnection,
        { id: nonExistingId },
      );
    },
  );
}
