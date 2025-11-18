import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token verification for a valid, active user account.
 *
 * This test validates that authentication tokens work correctly for active user
 * accounts. Since the provided API does not include a user deletion endpoint,
 * this test verifies the positive path: that tokens are valid and can be
 * verified for active user accounts. This establishes the baseline token
 * verification functionality.
 *
 * Test steps:
 *
 * 1. Create a new user account via registration endpoint
 * 2. Extract the authentication token from the registration response
 * 3. Verify the token is valid and active
 * 4. Validate response structure and token metadata
 * 5. Confirm user_account_active is true for the active user
 */
export async function test_api_token_verification_deleted_user_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();

  const createUserResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });

  typia.assert(createUserResponse);

  // Extract user ID and token
  const userId: string & tags.Format<"uuid"> = createUserResponse.id;
  const accessToken: string = createUserResponse.token.access;

  // Step 2: Prepare connection with authentication token
  const connWithToken: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };

  // Step 3: Verify the token is valid for the active user account
  const tokenVerification: ITodoListUser.ITokenVerification =
    await api.functional.todoList.user.auth.user.verify_token.verifyToken(
      connWithToken,
    );

  typia.assert(tokenVerification);

  // Step 4: Validate token verification response
  TestValidator.predicate(
    "token should be valid for active user",
    tokenVerification.is_valid === true,
  );

  TestValidator.predicate(
    "user account should be marked as active",
    tokenVerification.user_account_active === true,
  );

  TestValidator.equals(
    "token user ID should match created user",
    tokenVerification.user_id,
    userId,
  );

  TestValidator.predicate(
    "token should not be revoked",
    tokenVerification.is_revoked === false,
  );

  TestValidator.predicate(
    "failure reason should be null for valid token",
    tokenVerification.failure_reason === null,
  );

  // Step 5: Verify token lifetime information
  TestValidator.predicate(
    "token should have valid issued_at timestamp",
    typeof tokenVerification.issued_at === "string",
  );

  TestValidator.predicate(
    "token should have valid expires_at timestamp",
    typeof tokenVerification.expires_at === "string",
  );

  TestValidator.predicate(
    "remaining lifetime should be positive for newly created token",
    tokenVerification.remaining_lifetime_seconds > 0,
  );
}
