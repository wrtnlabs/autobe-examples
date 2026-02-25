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

export async function test_api_super_administrator_health_check_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as superAdministrator and get authorized connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // 2. Prepare update data for a health check record with a random UUID
  const idToUpdate = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IDiscussionBoardHealthCheck.IUpdate = {
    status: "OK",
    checkedAt: new Date().toISOString(),
    details:
      Math.random() < 0.5 ? RandomGenerator.paragraph({ sentences: 2 }) : null,
    updatedAt: new Date().toISOString(),
  };
  // 3. Perform the update operation
  const updatedHealthCheck =
    await api.functional.discussionBoard.superAdministrator.healthChecks.updateHealthCheck(
      superAdminConnection,
      {
        id: idToUpdate,
        body: updateBody,
      },
    );
  typia.assert(updatedHealthCheck);
  // 4. Validate response
  TestValidator.equals(
    "status updated",
    updatedHealthCheck.status,
    updateBody.status,
  );
  TestValidator.equals(
    "checkedAt updated",
    updatedHealthCheck.checkedAt,
    updateBody.checkedAt,
  );
  TestValidator.equals(
    "details updated",
    updatedHealthCheck.details ?? null,
    updateBody.details ?? null,
  );
  TestValidator.predicate(
    "updatedAt is ISO date string",
    !isNaN(Date.parse(updatedHealthCheck.updatedAt)),
  );
}
