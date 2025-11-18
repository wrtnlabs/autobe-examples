import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuth";

/**
 * Validates the guest logout response structure and content.
 *
 * This test verifies that the guest logout endpoint returns a properly
 * structured response with required confirmation fields. It ensures the
 * response conforms to the ITodoListAuth.IGuestLogoutResponse schema.
 *
 * The test validates:
 *
 * 1. Response includes 'success' boolean field reflecting logout result
 * 2. Response includes 'message' string field with human-readable confirmation
 * 3. Both fields are present and properly formatted
 * 4. Message content appropriately indicates guest session termination
 * 5. Overall response structure complies with the schema
 */
export async function test_api_guest_logout_response_structure_validation(
  connection: api.IConnection,
) {
  // Call the guest logout API endpoint
  const response: ITodoListAuth.IGuestLogoutResponse =
    await api.functional.todoList.auth.guest.logout(connection);

  // Validate the response structure with typia
  typia.assert(response);

  // Verify success field is a boolean
  TestValidator.predicate(
    "response should have success field as boolean",
    typeof response.success === "boolean",
  );

  // Verify message field is a non-empty string
  TestValidator.predicate(
    "response should have message field as non-empty string",
    typeof response.message === "string" && response.message.length > 0,
  );

  // Verify success is true (logout operation should be successful)
  TestValidator.equals(
    "logout operation should be successful",
    response.success,
    true,
  );

  // Verify message contains appropriate confirmation text
  TestValidator.predicate(
    "message should indicate guest session termination",
    response.message.toLowerCase().includes("guest") ||
      response.message.toLowerCase().includes("session") ||
      response.message.toLowerCase().includes("logout") ||
      response.message.toLowerCase().includes("terminated") ||
      response.message.toLowerCase().includes("successful"),
  );
}
