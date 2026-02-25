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

export async function test_api_system_setting_deletion_non_existent_id(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion attempt of a non-existent system setting by ID as a superAdministrator.
  // 1. Authenticate by creating a new superAdministrator account.
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword!123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdminAuthorized);
  // Update token in connection headers for authorization
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuthorized.token.access}`,
  };
  // 2. Attempt to delete a system setting with a random UUID that does not exist.
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify the response is HTTP 404 Not Found error
  await TestValidator.httpError(
    "delete non-existent system setting throws 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemSettings.eraseSystemSetting(
        superAdminConnection,
        { id: nonExistentId },
      );
    },
  );
}
