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

export async function test_api_system_setting_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Deletion attempt of system setting with a non-existent UUID by super administrator.
  // Authenticate as super administrator by joining.
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(adminAuth);
  // Set Authorization header after join
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = adminAuth.token.access;
  // Call delete with a random non-existent UUID as system setting ID.
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  // Verify the system returns a not found error status indicating the resource does not exist.
  await TestValidator.httpError(
    "not found on erase system setting",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemSettings.erase(
        superAdminConnection,
        {
          id: nonExistentUUID,
        },
      );
    },
  );
}
