import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
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

export async function test_api_super_administrator_health_check_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test updating a non-existent health check record to verify proper error handling.
  // 1. Authenticate as superAdministrator using the utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers = { Authorization: authorized.token.access };
  // 2. Attempt to update health check with a random/non-existent UUID
  const randomId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IDiscussionBoardHealthCheck.IUpdate = {
    status: "OK",
    checkedAt: new Date().toISOString(),
    details: null,
  };
  // 3. Verify the API returns a 404 error for not found
  await TestValidator.httpError(
    "update non-existent health check returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.healthChecks.updateHealthCheck(
        superAdminConnection,
        { id: randomId, body: updateBody },
      );
    },
  );
}
