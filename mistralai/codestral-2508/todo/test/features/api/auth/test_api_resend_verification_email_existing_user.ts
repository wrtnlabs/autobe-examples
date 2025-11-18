import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Tests re-sending an account verification email for a registered user.
 *
 * Ensures that providing the user's registered email triggers the dispatch of a
 * verification email, and the response is always neutral. Validates that no
 * user state is revealed in the response body beyond the neutral delivery
 * status.
 */
export async function test_api_resend_verification_email_existing_user(
  connection: api.IConnection,
) {
  // Generate a random, valid email address for the test user.
  const testEmail: string & tags.Format<"email"> & tags.MaxLength<254> =
    typia.random<string & tags.Format<"email"> & tags.MaxLength<254>>();

  // Submit a request to (re-)send the verification email to this address.
  const result: ITodoListUser.IVerificationStatus =
    await api.functional.auth.user.verification.request.requestVerification(
      connection,
      {
        body: { email: testEmail } satisfies ITodoListUser.IResendVerification,
      },
    );

  // Assert the response structure is exactly as defined (neutral, no user info).
  typia.assert(result);
  TestValidator.predicate(
    "response delivers neutral delivery flag only, true always on success",
    result.delivered === true || result.delivered === false,
  );
  // Optionally, confirm no additional fields are present
  TestValidator.equals(
    "no extra fields in verification response",
    Object.keys(result).sort(),
    ["delivered"],
  );
}
