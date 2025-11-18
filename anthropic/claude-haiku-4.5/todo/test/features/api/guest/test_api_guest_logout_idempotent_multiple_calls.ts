import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuth";

/**
 * Test idempotent guest logout with multiple calls.
 *
 * This test validates that calling guest logout multiple times behaves
 * idempotently. After the initial successful logout that terminates the guest
 * session, subsequent logout attempts should also return success without
 * errors, treating the operation as safe even on already-terminated sessions.
 *
 * The test ensures:
 *
 * 1. Initial guest logout succeeds and terminates the session
 * 2. Second logout attempt on terminated session succeeds
 * 3. Third logout attempt also succeeds
 * 4. All responses indicate successful logout
 * 5. No errors are raised for repeated logout operations
 *
 * This validates the idempotent nature of the logout endpoint and ensures the
 * system gracefully handles retry scenarios.
 */
export async function test_api_guest_logout_idempotent_multiple_calls(
  connection: api.IConnection,
) {
  // First logout call - initial session termination
  const firstLogout: ITodoListAuth.IGuestLogoutResponse =
    await api.functional.todoList.auth.guest.logout(connection);
  typia.assert(firstLogout);
  TestValidator.predicate(
    "first logout should succeed",
    firstLogout.success === true,
  );
  TestValidator.predicate(
    "first logout should return message",
    typeof firstLogout.message === "string" && firstLogout.message.length > 0,
  );

  // Second logout call - on already-terminated session
  const secondLogout: ITodoListAuth.IGuestLogoutResponse =
    await api.functional.todoList.auth.guest.logout(connection);
  typia.assert(secondLogout);
  TestValidator.predicate(
    "second logout should succeed (idempotent)",
    secondLogout.success === true,
  );
  TestValidator.predicate(
    "second logout should return message",
    typeof secondLogout.message === "string" && secondLogout.message.length > 0,
  );

  // Third logout call - further repeated attempt
  const thirdLogout: ITodoListAuth.IGuestLogoutResponse =
    await api.functional.todoList.auth.guest.logout(connection);
  typia.assert(thirdLogout);
  TestValidator.predicate(
    "third logout should succeed (idempotent)",
    thirdLogout.success === true,
  );
  TestValidator.predicate(
    "third logout should return message",
    typeof thirdLogout.message === "string" && thirdLogout.message.length > 0,
  );

  // Verify all responses have consistent success status
  TestValidator.equals(
    "all logout calls should have same success status",
    true,
    firstLogout.success === secondLogout.success &&
      secondLogout.success === thirdLogout.success &&
      firstLogout.success === true,
  );
}
