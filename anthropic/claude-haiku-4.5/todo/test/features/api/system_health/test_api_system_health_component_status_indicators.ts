import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemHealth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemHealth";

/**
 * Validates system health endpoint returns accurate component status
 * indicators.
 *
 * This test verifies the system health monitoring functionality by:
 *
 * 1. Creating an admin account with email and password credentials
 * 2. Retrieving the current system health status and all component indicators
 * 3. Validating that all critical components (database, api_server,
 *    authentication_system, data_storage) are present
 * 4. Ensuring each component has proper status (healthy/warning/critical),
 *    descriptive message, and last_check timestamp
 * 5. Verifying overall system status reflects the state of all components
 * 6. Validating performance metrics (response time, error rate, active sessions,
 *    queue length)
 * 7. Checking resource utilization metrics (CPU, memory, disk, database pool)
 *
 * The test ensures administrators can reliably monitor system operational
 * status and identify component-level issues.
 */
export async function test_api_system_health_component_status_indicators(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(8),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.equals("admin created successfully", admin.email, adminEmail);

  // Step 2: Retrieve system health status
  const health: ITodoAppSystemHealth =
    await api.functional.todoApp.admin.systemHealth.at(connection);
  typia.assert(health);

  // Step 3: Verify overall system status
  TestValidator.predicate(
    "system status is valid",
    ["healthy", "degraded", "critical"].includes(health.status),
  );

  // Step 4: Validate timestamp exists and is in ISO 8601 format
  TestValidator.predicate(
    "system timestamp is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(health.timestamp),
  );

  // Step 5: Verify components array exists and has items
  TestValidator.predicate(
    "components array exists and is not empty",
    Array.isArray(health.components) && health.components.length > 0,
  );

  // Step 6: Validate critical components are present
  const componentNames = health.components.map((c) => c.name);
  const criticalComponents = [
    "database",
    "api_server",
    "authentication_system",
    "data_storage",
  ];

  for (const critical of criticalComponents) {
    TestValidator.predicate(
      `critical component '${critical}' is present`,
      componentNames.includes(critical),
    );
  }

  // Step 7: Validate each component has proper structure
  for (const component of health.components) {
    TestValidator.predicate(
      `component '${component.name}' has valid name`,
      typeof component.name === "string" && component.name.length > 0,
    );

    TestValidator.predicate(
      `component '${component.name}' has valid status`,
      ["healthy", "warning", "critical"].includes(component.status),
    );

    TestValidator.predicate(
      `component '${component.name}' has message`,
      typeof component.message === "string" && component.message.length > 0,
    );

    TestValidator.predicate(
      `component '${component.name}' has valid last_check timestamp`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(component.last_check),
    );
  }

  // Step 8: Validate performance metrics
  TestValidator.predicate(
    "average response time is non-negative number",
    health.performance.average_response_time_ms >= 0,
  );

  TestValidator.predicate(
    "error rate is between 0 and 100",
    health.performance.error_rate_percent >= 0 &&
      health.performance.error_rate_percent <= 100,
  );

  TestValidator.predicate(
    "active sessions is non-negative integer",
    health.performance.active_sessions >= 0,
  );

  TestValidator.predicate(
    "request queue length is non-negative integer",
    health.performance.request_queue_length >= 0,
  );

  // Step 9: Validate resource utilization metrics
  TestValidator.predicate(
    "CPU usage is between 0 and 100 percent",
    health.resources.cpu_usage_percent >= 0 &&
      health.resources.cpu_usage_percent <= 100,
  );

  TestValidator.predicate(
    "memory usage is between 0 and 100 percent",
    health.resources.memory_usage_percent >= 0 &&
      health.resources.memory_usage_percent <= 100,
  );

  TestValidator.predicate(
    "disk usage is between 0 and 100 percent",
    health.resources.disk_usage_percent >= 0 &&
      health.resources.disk_usage_percent <= 100,
  );

  TestValidator.predicate(
    "database pool utilization is between 0 and 100 percent",
    health.resources.database_pool_utilization_percent >= 0 &&
      health.resources.database_pool_utilization_percent <= 100,
  );

  // Step 10: Verify at least one component status
  const databaseComponent = health.components.find(
    (c) => c.name === "database",
  );
  if (databaseComponent) {
    TestValidator.predicate(
      "database component has specific status",
      databaseComponent.status !== undefined,
    );
  }
}
