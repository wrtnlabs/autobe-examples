import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUptimeMonitoring";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of an existing uptime monitoring record.
 * As an administrator, authenticate via join to create an admin session.
 * Retrieve an uptime monitoring record by its UUID.
 * Validate that all expected fields are present and correctly formatted:
 * id (UUID), serviceName, serviceEndpoint, checkIntervalMinutes, responseTimeMs,
 * statusCode, isHealthy, uptimePercentage, downtimeMinutes, lastSuccessfulCheck,
 * createdAt, updatedAt, deletedAt.
 * Verify that timestamps follow ISO 8601 format.
 * Ensure the endpoint properly excludes soft-deleted records (deleted_at is null).
 */
export async function test_api_uptime_monitoring_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Generate a random UUID (assuming we don't have a creation endpoint)
  const monitoringId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve uptime monitoring record
  const monitoring =
    await api.functional.multiUserTodo.admin.uptime_monitorings.at(
      adminConnection,
      {
        monitoringId,
      },
    );
  typia.assert(monitoring);
  // 4. Validate all fields exist and have correct types (typia.assert already does this)
  // Additional business logic validation
  TestValidator.equals("id is UUID format", monitoring.id, monitoringId);
  TestValidator.predicate(
    "serviceName is string",
    typeof monitoring.serviceName === "string",
  );
  TestValidator.predicate(
    "serviceEndpoint is string",
    typeof monitoring.serviceEndpoint === "string",
  );
  TestValidator.predicate(
    "checkIntervalMinutes is integer",
    Number.isInteger(monitoring.checkIntervalMinutes),
  );
  TestValidator.predicate(
    "responseTimeMs is integer",
    Number.isInteger(monitoring.responseTimeMs),
  );
  TestValidator.predicate(
    "statusCode is integer",
    Number.isInteger(monitoring.statusCode),
  );
  TestValidator.predicate(
    "isHealthy is boolean",
    typeof monitoring.isHealthy === "boolean",
  );
  TestValidator.predicate(
    "uptimePercentage is number",
    typeof monitoring.uptimePercentage === "number",
  );
  TestValidator.predicate(
    "downtimeMinutes is integer",
    Number.isInteger(monitoring.downtimeMinutes),
  );
  // lastSuccessfulCheck can be null or undefined
  if (
    monitoring.lastSuccessfulCheck !== undefined &&
    monitoring.lastSuccessfulCheck !== null
  ) {
    TestValidator.predicate(
      "lastSuccessfulCheck is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        monitoring.lastSuccessfulCheck,
      ),
    );
  }
  TestValidator.predicate(
    "createdAt is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      monitoring.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      monitoring.updatedAt,
    ),
  );
  // deletedAt should be null (soft-deleted records excluded)
  TestValidator.equals("deletedAt is null", monitoring.deletedAt, null);
}
