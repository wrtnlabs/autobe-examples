import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppHealth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHealth";
export async function test_api_health_check_response_format(
  connection: api.IConnection,
): Promise<void> {
  // Call the health check endpoint to verify service availability
  const health = await api.functional.todoApp.health.healthCheck(connection);
  // Validate the complete response structure using typia.assert
  // This validates:
  // - status field contains valid enum values ('healthy' or 'unhealthy')
  // - timestamp follows ISO 8601 format (tags.Format<"date-time">)
  // - all required fields are present (status and timestamp)
  // - optional version field is properly typed if present
  typia.assert(health);
}
