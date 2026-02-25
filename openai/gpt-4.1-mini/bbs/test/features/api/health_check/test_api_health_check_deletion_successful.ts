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

export async function test_api_health_check_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  /*
   * This E2E test does the following:
   * 1. Register a new super administrator and obtain authorized connection
   * 2. Simulate or assume a health check record creation and get the record ID
   * 3. Perform deletion of the health check record via super administrator
   * 4. Confirm the deletion is successful (no content returned, test via void result)
   * 5. Enforce authorization is required (403 error when no or invalid token)
   */
  // Step 1: Register super administrator to get authorized connection
  const baseConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    baseConnection,
    {},
  );
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = { Authorization: superAdmin.token.access };
  // Step 2: Simulate the health check record ID
  // Since no endpoint creates health check record, we use a random UUID
  // In real integration test, replace this with actual health check creation method
  const healthCheckId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Try to delete the health check record
  // Should succeed without error, returning void (204 No Content)
  const result =
    await api.functional.discussionBoard.superAdministrator.healthChecks.erase(
      superAdminConnection,
      { id: healthCheckId },
    );
  TestValidator.equals("erase returns void", result, undefined);
  // Step 4: Authorization checks
  // Test without authorization header
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "delete without token returns 403",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.healthChecks.erase(
        noAuthConnection,
        { id: healthCheckId },
      );
    },
  );
  // Test with invalid authorization token
  const invalidTokenConnection: api.IConnection = { host: connection.host };
  invalidTokenConnection.headers = { Authorization: "Bearer invalidtoken" };
  await TestValidator.httpError(
    "delete with invalid token returns 403",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.healthChecks.erase(
        invalidTokenConnection,
        { id: healthCheckId },
      );
    },
  );
}
