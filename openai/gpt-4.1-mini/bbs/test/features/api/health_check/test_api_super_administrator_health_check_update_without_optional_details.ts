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

export async function test_api_super_administrator_health_check_update_without_optional_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = superAdmin.token.access;
  // 2. Prepare a random UUID for an existing health check ID
  // (In real test environment, should use fixture or known test data)
  const healthCheckId = typia.random<string & tags.Format<"uuid">>();
  // 3. Send PUT request with required fields status and checked_at only (omit details)
  const updateBody: IDiscussionBoardHealthCheck.IUpdate = {
    status: "WARNING",
    checkedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    details: null, // explicitly null to omit details
    // omit updatedAt to test server auto-fill behavior
  };
  const updatedRecord =
    await api.functional.discussionBoard.superAdministrator.healthChecks.updateHealthCheck(
      superAdminConnection,
      {
        id: healthCheckId,
        body: updateBody,
      },
    );
  typia.assert(updatedRecord);
  // 4. Verify response reflects update success and optional details is null
  TestValidator.equals(
    "updated status",
    updatedRecord.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated checkedAt",
    updatedRecord.checkedAt,
    updateBody.checkedAt,
  );
  TestValidator.equals("details is null", updatedRecord.details, null);
  // 5. Validate updatedAt is updated by server (should be non-null string)
  TestValidator.predicate(
    "updatedAt is updated",
    typeof updatedRecord.updatedAt === "string" &&
      updatedRecord.updatedAt.length > 0,
  );
}
