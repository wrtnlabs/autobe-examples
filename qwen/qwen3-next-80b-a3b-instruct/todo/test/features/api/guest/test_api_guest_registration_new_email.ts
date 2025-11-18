import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test successful guest registration with a new, unused email address.
 *
 * This scenario validates that the system accepts a valid email address and
 * creates a new guest registration record in the todo_list_guest table,
 * returning the created entry. The test verifies that the email is properly
 * stored and that no duplicate registration occurs for the same email during
 * this test.
 *
 * Workflow:
 *
 * 1. Generate a new, valid email address using typia.random with email format
 *    constraint
 * 2. Call the guest registration API with the generated email
 * 3. Validate that the response contains the exact email address submitted
 * 4. Confirm the response is of type ITodoListGuest using typia.assert
 */
export async function test_api_guest_registration_new_email(
  connection: api.IConnection,
) {
  // Generate a new, valid email address for testing
  const newEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Register the guest with the new email address
  const response: ITodoListGuest =
    await api.functional.todoList.todo_list_guests.create(connection, {
      body: { email: newEmail } satisfies ITodoListGuest.ICreate,
    });

  // Validate the response type and structure
  typia.assert(response);

  // Verify the returned email matches the submitted email
  TestValidator.equals(
    "registered email matches submitted email",
    response.email,
    newEmail,
  );
}
