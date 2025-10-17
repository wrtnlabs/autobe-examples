import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller password change functionality.
 *
 * This test validates the password change operation for sellers:
 *
 * 1. Create a seller account
 * 2. Perform password change with current password verification
 * 3. Verify password change success
 * 4. Confirm old password no longer works for login
 * 5. Verify new password works for login
 *
 * Note: The original scenario requested testing session invalidation, but this
 * cannot be implemented because there are no authenticated seller endpoints
 * available to test whether sessions are invalidated. The test focuses on
 * password change functionality and login validation.
 */
export async function test_api_seller_password_change_selective_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<string & tags.MinLength<8>>();

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

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Change password
  const newPassword = typia.random<string & tags.MinLength<8>>();

  const passwordChangeResult =
    await api.functional.auth.seller.password.change.changePassword(
      connection,
      {
        body: {
          current_password: originalPassword,
          new_password: newPassword,
        } satisfies IShoppingMallSeller.IPasswordChange,
      },
    );
  typia.assert(passwordChangeResult);

  TestValidator.predicate(
    "password change should return success message",
    passwordChangeResult.message.length > 0,
  );

  // Step 3: Verify old password no longer works
  await TestValidator.error(
    "old password should not work after password change",
    async () => {
      const unauthConnection: api.IConnection = { ...connection, headers: {} };
      await api.functional.shoppingMall.sellers.sessions.post(
        unauthConnection,
        {
          body: {
            email: sellerEmail,
            password: originalPassword,
          } satisfies IShoppingMallSeller.ILogin,
        },
      );
    },
  );

  // Step 4: Verify new password works for login
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  const newLoginResult =
    await api.functional.shoppingMall.sellers.sessions.post(unauthConnection, {
      body: {
        email: sellerEmail,
        password: newPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(newLoginResult);
  TestValidator.equals(
    "new login should return same seller ID",
    newLoginResult.id,
    seller.id,
  );
}
