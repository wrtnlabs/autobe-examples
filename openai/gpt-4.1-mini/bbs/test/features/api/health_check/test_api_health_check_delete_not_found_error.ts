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

export async function test_api_health_check_delete_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test deletion attempt on a non-existent health check record by an administrator.
  // 1. Create a new administrator account and authenticate.
  // 2. Attempt to delete a health check record using a randomly generated UUID (that does not exist).
  // 3. Verify that the system responds with a 404 Not Found error.
  // 1. Admin authentication via join utility
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // adminConnection.headers updated by authorize utility
  // 2. Attempt to delete a non-existent health check record
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting non-existent health check returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.healthChecks.erase(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
}
