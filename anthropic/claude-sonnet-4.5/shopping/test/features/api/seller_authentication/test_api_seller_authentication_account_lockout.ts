import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller account lockout protection after 5 failed login attempts.
 *
 * This test validates the security mechanism that prevents brute force attacks
 * by locking seller accounts after repeated authentication failures. The test
 * verifies that after 5 failed login attempts within a 15-minute window, the
 * account is locked and subsequent authentication attempts are rejected.
 *
 * Test workflow:
 *
 * 1. Create a new seller account with valid registration data
 * 2. Attempt authentication 5 times with incorrect password to trigger lockout
 * 3. Verify that the 6th authentication attempt fails due to account lockout
 * 4. Confirm the account lockout behavior is working as expected
 *
 * Note: This test does not include email verification as the verification token
 * is not accessible in E2E test environment. The test focuses on the account
 * lockout mechanism assuming the backend allows login attempts on accounts
 * regardless of verification status (which triggers lockout after failures).
 */
export async function test_api_seller_authentication_account_lockout(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "SecureP@ssw0rd123";
  const incorrectPassword = "WrongPassword456";

  const registrationData = {
    email: sellerEmail,
    password: correctPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} Street, ${RandomGenerator.name()} City`,
    tax_id: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<100000000> & tags.Maximum<999999999>>()}`,
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: registrationData,
  });
  typia.assert(seller);

  // Step 2: Attempt 5 failed login attempts with incorrect password
  const failedAttempts = 5;
  for (let i = 0; i < failedAttempts; i++) {
    await TestValidator.error(
      `failed login attempt ${i + 1} should fail with incorrect password`,
      async () => {
        await api.functional.shoppingMall.sellers.sessions.post(connection, {
          body: {
            email: sellerEmail,
            password: incorrectPassword,
          } satisfies IShoppingMallSeller.ILogin,
        });
      },
    );
  }

  // Step 3: Verify that subsequent authentication attempts are rejected due to account lockout
  // This should fail even with correct password because account is now locked
  await TestValidator.error(
    "authentication should fail due to account lockout after 5 failed attempts",
    async () => {
      await api.functional.shoppingMall.sellers.sessions.post(connection, {
        body: {
          email: sellerEmail,
          password: correctPassword,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Step 4: Verify another attempt with incorrect password also fails during lockout
  await TestValidator.error(
    "authentication with incorrect password should also fail during lockout period",
    async () => {
      await api.functional.shoppingMall.sellers.sessions.post(connection, {
        body: {
          email: sellerEmail,
          password: incorrectPassword,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
}
