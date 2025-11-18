import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test redundant unlock attempt for already unlocked user.
 *
 * This test ensures that the /auth/user/unlock API returns a clear and robust
 * message when a user tries to unlock an account that is not currently locked.
 * It verifies idempotency and that no errors, lock state changes, or unintended
 * effects occur when the operation is safely retried on an unlocked account.
 *
 * 1. Generate a random but valid user email and unlock token.
 * 2. Attempt to unlock with these credentials, simulating a not-locked state.
 * 3. Assert the API responds with a message indicating the account is already
 *    unlocked, and can_login is true with no next_step required.
 */
export async function test_api_user_unlock_already_unlocked(
  connection: api.IConnection,
) {
  // Step 1: Arrange input data (simulate not-locked user)
  const email = typia.random<string & tags.Format<"email">>();
  const unlock_token = RandomGenerator.alphaNumeric(16);
  const requestBody = { email, unlock_token } satisfies ITodoListUser.IUnlock;

  // Step 2: Attempt unlock
  const response = await api.functional.auth.user.unlock(connection, {
    body: requestBody,
  });
  typia.assert(response);

  // Step 3: Assert idempotent/unlocked response
  // Business logic: Should be a descriptive message about already being unlocked, can_login true, no next_step
  TestValidator.predicate(
    "response message indicates already unlocked",
    typeof response.message === "string" &&
      (response.message.toLowerCase().includes("already unlocked") ||
        response.message.toLowerCase().includes("not locked") ||
        response.message.toLowerCase().includes("no action needed")),
  );
  TestValidator.predicate(
    "account can login after redundant unlock",
    response.can_login === true,
  );
  // next_step is undefined or null if no further steps required
  TestValidator.predicate(
    "no next_step required if already unlocked",
    response.next_step === null || response.next_step === undefined,
  );
}
