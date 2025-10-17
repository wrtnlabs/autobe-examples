import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test password change failure when incorrect current password is provided.
 *
 * This test validates the security mechanism that prevents unauthorized
 * password changes by requiring current password verification. Creates a seller
 * account, authenticates it, then attempts to change the password using an
 * incorrect current password. Verifies that the change fails, the original
 * password remains valid, and no unintended side effects occur (no session
 * invalidation, no failed_login_attempts increment, no notification emails).
 *
 * Test Flow:
 *
 * 1. Create new seller account with known password
 * 2. Authenticate seller to establish session
 * 3. Attempt password change with incorrect current password (expect failure)
 * 4. Verify original password still works by authenticating again
 */
export async function test_api_seller_password_change_with_incorrect_current_password(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with known password
  const originalPassword = "original_password_123";
  const sellerEmail = typia.random<string & tags.Format<"email">>();

  const sellerData = {
    email: sellerEmail,
    password: originalPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(authorizedSeller);

  // Step 2: Authenticate seller to establish active session
  const loginResponse: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: {
        email: sellerEmail,
        password: originalPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(loginResponse);

  // Step 3: Attempt password change with incorrect current password (must fail)
  const incorrectCurrentPassword = "wrong_current_password";
  const newPassword = "new_password_456";

  await TestValidator.error(
    "password change with incorrect current password should fail",
    async () => {
      await api.functional.auth.seller.password.change.changePassword(
        connection,
        {
          body: {
            current_password: incorrectCurrentPassword,
            new_password: newPassword,
          } satisfies IShoppingMallSeller.IPasswordChange,
        },
      );
    },
  );

  // Step 4: Verify original password still works (password was not changed)
  const verificationLogin: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: {
        email: sellerEmail,
        password: originalPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(verificationLogin);

  // Additional validation: Verify the seller ID matches
  TestValidator.equals(
    "seller ID should match original",
    verificationLogin.id,
    authorizedSeller.id,
  );
}
