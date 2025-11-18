import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test unlock attempt with an invalid or expired unlock token.
 *
 * - Simulates a scenario where a user account is locked, but an attempt is made
 *   to unlock it using an invalid token.
 * - Expects business logic to reject unlock when unlock_token does not match the
 *   valid token for the user.
 * - The unlock operation should fail and indicate that the account remains
 *   locked.
 * - Validates that account recovery logic is secure and does not allow bypass.
 *
 * Steps:
 *
 * 1. Generate a random valid email for a test user.
 * 2. Attempt to unlock the account using the valid email and a clearly invalid
 *    unlock_token.
 * 3. Verify that API responds with { success: false, can_login: false } and an
 *    error message indicating invalid token or failure to unlock.
 */
export async function test_api_user_unlock_invalid_token(
  connection: api.IConnection,
) {
  // 1. Generate a random valid email
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 2. Craft unlock body with invalid (random) unlock_token
  const body = {
    email,
    unlock_token: RandomGenerator.alphaNumeric(32) + "-invalid-token",
  } satisfies ITodoListUser.IUnlock;

  // 3. Attempt unlock and verify failure response
  const result: ITodoListUser.IUnlockResult =
    await api.functional.auth.user.unlock(connection, { body });
  typia.assert(result);
  TestValidator.equals("unlock attempt fails", result.success, false);
  TestValidator.equals("cannot login remains", result.can_login, false);
  TestValidator.predicate(
    "unlock error message contains invalid or fail wording",
    typeof result.message === "string" &&
      /invalid|fail|error|expired|not valid|wrong|incorrect/i.test(
        result.message,
      ),
  );
}
