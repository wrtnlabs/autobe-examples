import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";
import type { ITodoAppTodoDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoDashboardSummary";

/**
 * Test that unauthenticated users cannot access the dashboard.
 *
 * This test validates authentication enforcement by attempting to access the
 * dashboard endpoint without valid JWT authentication credentials. The system
 * should return a 401 Unauthorized error with a message directing the user to
 * log in first. This ensures the dashboard is properly protected from
 * unauthorized access.
 *
 * Test Steps:
 *
 * 1. Create an unauthenticated connection with empty headers
 * 2. Attempt to access the dashboard endpoint without authentication
 * 3. Verify that the API returns a 401 Unauthorized error
 * 4. Confirm that unauthenticated access is properly blocked
 */
export async function test_api_dashboard_unauthenticated_access(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by removing all headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to access the dashboard without authentication
  // The API should return a 401 Unauthorized error
  await TestValidator.error(
    "unauthenticated access to dashboard should fail with 401",
    async () => {
      await api.functional.todoApp.user.dashboard.index(
        unauthenticatedConnection,
      );
    },
  );
}
