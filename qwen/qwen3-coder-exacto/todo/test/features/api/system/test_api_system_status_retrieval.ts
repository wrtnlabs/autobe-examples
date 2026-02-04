import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodoUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserStatus";
export async function test_api_system_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test the system status endpoint to ensure it returns the correct status information
  // including server time, status, uptime, and version. This is a public endpoint
  // that does not require authentication.
  // Call the system status endpoint
  const status: ITodoAppTodoUserStatus =
    await api.functional.todoApp.system.status.at(connection);
  // Validate the response using typia assertion
  typia.assert(status);
  // Validate that serverTime is a valid ISO 8601 date-time string
  TestValidator.predicate(
    "server time should be a valid ISO 8601 date-time",
    () => {
      const date = new Date(status.serverTime);
      return !isNaN(date.getTime());
    },
  );
  // Validate that status is one of the expected values
  TestValidator.predicate(
    "status should be one of operational, degraded, or down",
    () => ["operational", "degraded", "down"].includes(status.status),
  );
  // Validate that uptime is a non-negative number
  TestValidator.predicate(
    "uptime should be a non-negative number",
    () => status.uptime >= 0,
  );
  // Validate that version is a non-empty string
  TestValidator.predicate(
    "version should be a non-empty string",
    () => typeof status.version === "string" && status.version.length > 0,
  );
}
