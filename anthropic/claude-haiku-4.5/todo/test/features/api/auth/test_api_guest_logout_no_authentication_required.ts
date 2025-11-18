import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuth";

/**
 * Test guest logout without authentication requirements.
 *
 * Validates that the guest logout endpoint is accessible without any
 * authentication credentials or JWT tokens. Guest users can invoke logout as a
 * public operation, clearing their transient session state. This test confirms
 * that guest logout is designed for unauthenticated users and does not require
 * login.
 *
 * Test flow:
 *
 * 1. Create unauthenticated connection with empty headers
 * 2. Invoke guest logout endpoint without credentials
 * 3. Validate successful response indicating session termination
 * 4. Verify response structure matches expected logout confirmation format
 */
export async function test_api_guest_logout_no_authentication_required(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by removing any authorization headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Invoke guest logout endpoint without any authentication credentials
  const response: ITodoListAuth.IGuestLogoutResponse =
    await api.functional.todoList.auth.guest.logout(unauthConn);

  // Validate response structure and type
  typia.assert(response);

  // Verify that logout was successful
  TestValidator.predicate(
    "guest logout should indicate success",
    response.success === true,
  );

  // Verify that response contains a confirmation message
  TestValidator.predicate(
    "guest logout should return a message",
    typeof response.message === "string" && response.message.length > 0,
  );
}
