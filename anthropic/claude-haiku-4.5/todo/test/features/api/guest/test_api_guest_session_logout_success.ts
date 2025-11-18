import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuth";

export async function test_api_guest_session_logout_success(
  connection: api.IConnection,
) {
  // Call the guest logout endpoint
  const response: ITodoListAuth.IGuestLogoutResponse =
    await api.functional.todoList.auth.guest.logout(connection);

  // Validate the response type
  typia.assert(response);

  // Verify that logout was successful
  TestValidator.predicate(
    "guest session logout should return success=true",
    response.success,
  );

  // Verify that a confirmation message is provided
  TestValidator.predicate(
    "logout response should contain a non-empty message",
    response.message.length > 0,
  );
}
