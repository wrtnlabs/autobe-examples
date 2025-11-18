import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that multiple consecutive verifications of the same valid token return
 * consistent results.
 *
 * This test validates token verification idempotency by calling the
 * verify-token endpoint multiple times with the same token. It ensures that
 * immutable token properties (is_valid, user_id, token_jti, issued_at,
 * expires_at) remain consistent across sequential calls, while allowing for
 * slight variation in remaining_lifetime_seconds due to elapsed time between
 * calls.
 *
 * Test flow:
 *
 * 1. Create a new user via join endpoint to obtain a valid authentication token
 * 2. Call verify-token endpoint multiple times sequentially with the same token
 * 3. Validate that is_valid remains true across all verifications
 * 4. Validate that user_id, token_jti, issued_at, and expires_at remain unchanged
 * 5. Validate that remaining_lifetime_seconds decreases or stays the same with
 *    each call
 * 6. Ensure is_revoked and user_account_active remain false and true respectively
 */
export async function test_api_token_verification_multiple_sequential_verifications(
  connection: api.IConnection,
) {
  // Step 1: Create a new user and obtain authentication token
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12); // Ensure at least 8 characters
  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: `${password}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  const accessToken = joinResponse.token.access;
  TestValidator.predicate(
    "access token should be obtained",
    accessToken.length > 0,
  );

  // Step 2 & 3: Perform multiple sequential token verifications
  const verificationResults: ITodoListUser.ITokenVerification[] = [];
  const verificationCount = 5;

  for (let i = 0; i < verificationCount; i++) {
    // Small delay between verifications to ensure timestamp differences
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const verification: ITodoListUser.ITokenVerification =
      await api.functional.todoList.user.auth.user.verify_token.verifyToken(
        connection,
      );
    typia.assert(verification);
    verificationResults.push(verification);

    // Validate that is_valid is true for this verification
    TestValidator.predicate(
      `verification ${i + 1}: token should be valid`,
      verification.is_valid === true,
    );
  }

  // Step 4: Validate immutable fields remain consistent across all verifications
  const firstVerification = verificationResults[0];

  for (let i = 1; i < verificationResults.length; i++) {
    const currentVerification = verificationResults[i];

    TestValidator.equals(
      `verification ${i + 1}: user_id should match first verification`,
      currentVerification.user_id,
      firstVerification.user_id,
    );

    TestValidator.equals(
      `verification ${i + 1}: token_jti should match first verification`,
      currentVerification.token_jti,
      firstVerification.token_jti,
    );

    TestValidator.equals(
      `verification ${i + 1}: issued_at should match first verification`,
      currentVerification.issued_at,
      firstVerification.issued_at,
    );

    TestValidator.equals(
      `verification ${i + 1}: expires_at should match first verification`,
      currentVerification.expires_at,
      firstVerification.expires_at,
    );

    TestValidator.equals(
      `verification ${i + 1}: is_revoked should remain false`,
      currentVerification.is_revoked,
      false,
    );

    TestValidator.equals(
      `verification ${i + 1}: user_account_active should remain true`,
      currentVerification.user_account_active,
      true,
    );
  }

  // Step 5: Validate that remaining_lifetime_seconds decreases or stays the same
  for (let i = 1; i < verificationResults.length; i++) {
    const previousVerification = verificationResults[i - 1];
    const currentVerification = verificationResults[i];

    TestValidator.predicate(
      `verification ${i + 1}: remaining_lifetime_seconds should not increase`,
      currentVerification.remaining_lifetime_seconds <=
        previousVerification.remaining_lifetime_seconds,
    );
  }

  // Final validation: Confirm all verifications show consistent token state
  TestValidator.predicate(
    "all verifications should indicate valid token",
    verificationResults.every((v) => v.is_valid === true),
  );

  TestValidator.predicate(
    "all verifications should show positive remaining lifetime",
    verificationResults.every((v) => v.remaining_lifetime_seconds > 0),
  );
}
