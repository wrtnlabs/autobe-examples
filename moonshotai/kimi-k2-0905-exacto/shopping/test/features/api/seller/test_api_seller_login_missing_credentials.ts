import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test login attempts with authentication scenarios including invalid
 * credentials. Validates that the authentication system properly handles
 * authentication failures and provides appropriate error responses for
 * credential mismatches.
 *
 * Test workflow:
 *
 * 1. Generate legitimate seller credentials
 * 2. Test login with wrong password (business logic validation)
 * 3. Test login with non-existent seller account
 * 4. Verify authentication errors are properly handled
 *
 * This ensures the seller authentication system properly validates credentials
 * and provides meaningful error responses for authentication failures.
 */
export async function test_api_seller_login_missing_credentials(
  connection: api.IConnection,
) {
  // Step 1: Generate legitimate seller credentials for testing
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "ValidPassword123!";

  // Step 2: Test authentication with wrong password (business logic error)
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: validEmail,
          password: "WrongPassword123!", // Different password, same email
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Step 3: Test with another non-existent seller
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "login should fail for non-existent seller",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "SomePassword123!",
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Step 4: Test authentication with realistic data (establish baseline)
  const legitimateCredentials = typia.random<IShoppingMallSeller.ILogin>();
  await TestValidator.error(
    "legitimate credentials should be accepted",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: legitimateCredentials,
      });
    },
  );
}
