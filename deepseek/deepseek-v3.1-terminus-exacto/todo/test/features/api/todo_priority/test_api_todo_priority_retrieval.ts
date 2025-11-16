import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";

/**
 * Test retrieval of specific todo priority level details by priority code.
 *
 * This test validates that the system correctly returns priority information
 * including code, name, description, weight, and active status when provided
 * with a valid priority code identifier. The test ensures that priority
 * reference data is accessible and properly formatted for administrative review
 * and management purposes.
 */
export async function test_api_todo_priority_retrieval(
  connection: api.IConnection,
) {
  // Test with common priority codes that should exist in the system
  const priorityCodes = ["low", "medium", "high"] as const;

  for (const priorityCode of priorityCodes) {
    // Retrieve priority details for each code
    const priority: ITodoAppTodoPriority =
      await api.functional.todoApp.todos.priorities.at(connection, {
        priorityCode: priorityCode,
      });

    // Validate the response structure and types
    typia.assert(priority);

    // Verify that the returned priority code matches the requested code
    TestValidator.equals(
      `priority code should match requested code: ${priorityCode}`,
      priority.code,
      priorityCode,
    );

    // Validate all required properties exist and have correct types
    TestValidator.predicate(
      `priority should have UUID id: ${priorityCode}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        priority.id,
      ),
    );

    TestValidator.predicate(
      `priority name should be non-empty string: ${priorityCode}`,
      typeof priority.name === "string" && priority.name.length > 0,
    );

    TestValidator.predicate(
      `priority weight should be integer: ${priorityCode}`,
      Number.isInteger(priority.weight),
    );

    TestValidator.predicate(
      `priority active status should be boolean: ${priorityCode}`,
      typeof priority.is_active === "boolean",
    );

    TestValidator.predicate(
      `priority created_at should be valid date-time: ${priorityCode}`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        priority.created_at,
      ),
    );

    // Validate optional description if present
    if (priority.description !== undefined) {
      TestValidator.predicate(
        `priority description should be string when present: ${priorityCode}`,
        typeof priority.description === "string",
      );
    }
  }
}
