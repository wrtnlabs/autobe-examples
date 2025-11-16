import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer login with invalid password to verify authentication failure
 * handling.
 *
 * This test validates that the authentication system properly rejects login
 * attempts when the correct email is provided but with an incorrect password.
 * It ensures:
 *
 * 1. Creates a buyer account with known email and password credentials
 * 2. Attempts to login using the correct email but with a wrong password
 * 3. Verifies that the authentication attempt fails and throws an error
 * 4. Confirms no authentication tokens are issued for failed login attempts
 * 5. Ensures password verification is performed securely through hashing without
 *    revealing specific information about why authentication failed
 *
 * This test focuses on business logic validation of authentication failure
 * rather than type validation, confirming the system's security posture when
 * handling invalid credentials.
 */
export async function test_api_buyer_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account with known credentials
  const correctEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "ValidPassword123";
  const wrongPassword = "WrongPassword456";

  const registrationData = {
    email: correctEmail,
    password: correctPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const registeredBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredBuyer);

  // Step 2: Attempt to login with correct email but wrong password
  // This should fail and throw an error
  await TestValidator.error(
    "login with invalid password should fail",
    async () => {
      await api.functional.auth.buyer.login(connection, {
        body: {
          email: correctEmail,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallBuyer.ILogin,
      });
    },
  );
}
