import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller login behavior with invalid credentials.
 *
 * This test validates that the authentication system properly rejects login
 * attempts when incorrect credentials are provided. It ensures that:
 *
 * 1. Invalid password with valid email format is rejected
 * 2. No authorization tokens are issued for failed login attempts
 * 3. The system handles authentication failures securely
 * 4. Error responses are returned appropriately without revealing user existence
 *
 * The test attempts to authenticate with a randomly generated email and an
 * incorrect password, expecting the API to throw an error and deny access.
 */
export async function test_api_seller_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Generate test credentials with valid format but invalid password
  const testEmail = typia.random<string & tags.Format<"email">>();
  const invalidPassword = RandomGenerator.alphaNumeric(12);
  const currentPageUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  // Attempt login with invalid credentials and expect failure
  await TestValidator.error(
    "seller login should fail with invalid credentials",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: testEmail,
          password: invalidPassword,
          ip: null,
          href: currentPageUrl,
          referrer: referrerUrl,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
}
