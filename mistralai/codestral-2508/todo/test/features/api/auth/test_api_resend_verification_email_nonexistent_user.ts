import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates the neutral privacy response when requesting a verification email
 * for an unregistered address.
 *
 * This test simulates the scenario where a user requests a verification email
 * to an email address that does not correspond to any existing account
 * (simulating a targeted probing attack or accidental misspelling). The API
 * must not disclose whether the account exists or not. The response must always
 * indicate a neutral delivery status, preserving privacy and security
 * boundaries.
 *
 * 1. Generate a random but syntactically valid email address to ensure it's almost
 *    certainly unregistered.
 * 2. Make a POST request to /auth/user/verification/request with this address
 *    using the requestVerification function.
 * 3. Check that the API response is { delivered: true } and validate its type with
 *    typia.assert().
 * 4. Assert that no exception or error is thrown and no existence information is
 *    leaked.
 */
export async function test_api_resend_verification_email_nonexistent_user(
  connection: api.IConnection,
) {
  // 1. Generate unique, likely-unregistered email address
  const randomEmail = `${RandomGenerator.alphabets(16)}_${RandomGenerator.alphabets(8)}@nonexistent-${RandomGenerator.alphabets(6)}.com`;
  const reqBody = {
    email: randomEmail,
  } satisfies ITodoListUser.IResendVerification;

  // 2. Request verification
  const result =
    await api.functional.auth.user.verification.request.requestVerification(
      connection,
      {
        body: reqBody,
      },
    );

  // 3. Validate response type
  typia.assert(result);

  // 4. Check for strict neutral result (should always be delivered: true)
  TestValidator.equals(
    "verification request for unregistered email must always return delivered: true",
    result.delivered,
    true,
  );
}
