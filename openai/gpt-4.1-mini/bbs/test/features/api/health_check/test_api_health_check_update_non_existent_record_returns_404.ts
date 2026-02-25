import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_health_check_update_non_existent_record_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Prepare update body with valid data
  const body = {
    status: "OK",
    checkedAt: new Date().toISOString(),
    details: "Non-existent record update test",
    updatedAt: new Date().toISOString(),
  } satisfies IDiscussionBoardHealthCheck.IUpdate;
  // 3. Use random UUID for non-existent ID
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to update non-existent health check record, expect 404 error
  await TestValidator.httpError(
    `update non-existent health check record returns 404`,
    404,
    async () => {
      await api.functional.discussionBoard.administrator.healthChecks.updateHealthCheck(
        adminConnection,
        { id: fakeId, body },
      );
    },
  );
}
