import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token verification for revoked tokens.
 *
 * This test validates the complete token revocation workflow:
 *
 * 1. Create a new user account and obtain authentication tokens
 * 2. Verify the token is valid before revocation
 * 3. Logout the user to revoke the current token
 * 4. Attempt to verify the revoked token
 * 5. Confirm that the endpoint correctly identifies the token as revoked with
 *    is_valid: false and is_revoked: true
 *
 * This ensures that the token blacklist mechanism properly prevents reuse of
 * revoked tokens and that revoked tokens are correctly identified even before
 * expiration.
 */
export async function test_api_token_verification_revoked_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and get initial authentication tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(12);

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Verify the token is valid before revocation
  const beforeLogoutVerification: ITodoListUser.ITokenVerification =
    await api.functional.todoList.user.auth.user.verify_token.verifyToken(
      connection,
    );
  typia.assert(beforeLogoutVerification);

  TestValidator.equals(
    "token should be valid before logout",
    beforeLogoutVerification.is_valid,
    true,
  );
  TestValidator.equals(
    "token should not be revoked before logout",
    beforeLogoutVerification.is_revoked,
    false,
  );
  TestValidator.equals(
    "failure reason should be null when token is valid",
    beforeLogoutVerification.failure_reason,
    null,
  );

  // Step 3: Logout the user to revoke the current token
  const logoutResponse: ITodoListLogoutResponse =
    await api.functional.todoList.user.auth.user.logout(connection);
  typia.assert(logoutResponse);

  TestValidator.equals(
    "logout should be successful",
    logoutResponse.success,
    true,
  );
  TestValidator.equals(
    "one session should be affected by logout",
    logoutResponse.sessions_affected,
    1,
  );

  // Step 4: Attempt to verify the revoked token
  const afterLogoutVerification: ITodoListUser.ITokenVerification =
    await api.functional.todoList.user.auth.user.verify_token.verifyToken(
      connection,
    );
  typia.assert(afterLogoutVerification);

  // Step 5: Confirm the revoked token is properly identified
  TestValidator.equals(
    "token should be invalid after logout",
    afterLogoutVerification.is_valid,
    false,
  );
  TestValidator.equals(
    "token should be marked as revoked",
    afterLogoutVerification.is_revoked,
    true,
  );
  TestValidator.predicate(
    "failure reason should explain revocation",
    afterLogoutVerification.failure_reason !== null &&
      afterLogoutVerification.failure_reason.toLowerCase().includes("revok"),
  );
  TestValidator.equals(
    "user account should still be active",
    afterLogoutVerification.user_account_active,
    true,
  );
}
