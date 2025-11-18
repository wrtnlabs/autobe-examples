import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates successful unlock of a previously locked user account.
 *
 * This test simulates a user account that has been locked (e.g., due to
 * repeated failed logins), which now has a valid unlock token. It performs an
 * unlock request with the correct email and unlock token and asserts the proper
 * unlock behavior:
 *
 * 1. Prepares a locked account scenario (precondition): assumes a locked user and
 *    a valid unlock token are available (these would be arranged in system
 *    setup or by prior steps in an integrated suite).
 * 2. Sends a POST request to /auth/user/unlock with the locked account's email and
 *    valid unlock token.
 * 3. Checks that the unlock response indicates success, with message explaining
 *    the result, and user is granted login eligibility immediately (can_login:
 *    true).
 * 4. Verifies all fields in the response are type-safe, and next_step is omitted
 *    or null on success.
 */
export async function test_api_user_unlock_successful(
  connection: api.IConnection,
) {
  // 1. Simulate locked user credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const unlock_token: string = RandomGenerator.alphaNumeric(32);
  const body = { email, unlock_token } satisfies ITodoListUser.IUnlock;

  // 2. Attempt account unlock with correct credentials
  const result = await api.functional.auth.user.unlock(connection, { body });
  typia.assert(result);

  // 3. Verify unlock operation response
  TestValidator.predicate(
    "unlock result should indicate success",
    result.success === true,
  );
  TestValidator.predicate(
    "can_login should be true after unlock",
    result.can_login === true,
  );
  TestValidator.predicate(
    "unlock message should be a non-empty string",
    typeof result.message === "string" && result.message.length > 0,
  );
  TestValidator.equals(
    "next_step should be missing or undefined on success",
    result.next_step,
    undefined,
  );
}
