import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppHealth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHealth";
export async function test_api_health_check_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Call the health check endpoint to verify service availability
  const healthResponse: ITodoAppHealth =
    await api.functional.todoApp.health.healthCheck(connection);
  // Step 2: Validate the response structure matches ITodoAppHealth type
  // This validates status ("healthy" | "unhealthy"), timestamp (ISO 8601), and optional version
  typia.assert(healthResponse);
  // Step 3: Verify the service reports healthy status
  TestValidator.equals(
    "health status should be healthy",
    healthResponse.status,
    "healthy",
  );
  // Step 4: Verify timestamp is present and valid
  // The ISO 8601 format validation is already handled by typia.assert
  TestValidator.predicate(
    "timestamp should be present",
    healthResponse.timestamp.length > 0,
  );
}
