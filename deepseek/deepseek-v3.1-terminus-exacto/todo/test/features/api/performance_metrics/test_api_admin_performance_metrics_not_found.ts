import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoPerformanceMetric";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test error handling when attempting to retrieve a non-existent performance metric.
 * Verify that when an admin provides an invalid or non-existent metricId UUID,
 * the system returns an appropriate 'not found' error response.
 */
export async function test_api_admin_performance_metrics_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Test with valid UUID format but non-existent ID
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent valid UUID should return not found",
    async () => {
      await api.functional.multiUserTodo.admin.performance_metrics.at(
        adminConnection,
        {
          metricId: nonExistentUuid,
        },
      );
    },
  );
  // 3. Test with invalid UUID format (malformed string)
  await TestValidator.error(
    "invalid UUID format should return error",
    async () => {
      await api.functional.multiUserTodo.admin.performance_metrics.at(
        adminConnection,
        {
          metricId: "non-existent-id",
        },
      );
    },
  );
  // 4. Test with empty string as metricId
  await TestValidator.error(
    "empty string metricId should return error",
    async () => {
      await api.functional.multiUserTodo.admin.performance_metrics.at(
        adminConnection,
        {
          metricId: "",
        },
      );
    },
  );
  // 5. Test with nullish value (empty string only allowed in this case)
  // Note: SDK requires string type for metricId, so we can't directly pass null/undefined
  // But we can test with other invalid formats
  const invalidUuidWithSpaces = "  not-a-uuid  ";
  await TestValidator.error(
    "UUID with spaces should return error",
    async () => {
      await api.functional.multiUserTodo.admin.performance_metrics.at(
        adminConnection,
        {
          metricId: invalidUuidWithSpaces,
        },
      );
    },
  );
}
