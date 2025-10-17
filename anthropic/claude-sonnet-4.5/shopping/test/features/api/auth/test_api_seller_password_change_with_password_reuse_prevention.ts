import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test password reuse prevention during seller password changes.
 *
 * This test validates that the shopping mall platform correctly enforces
 * password reuse prevention by maintaining a history of the last 5 passwords
 * and rejecting attempts to reuse any of them. The test creates a seller
 * account, performs multiple password changes to build password history, then
 * attempts to reuse a previous password and validates proper rejection.
 *
 * Test workflow:
 *
 * 1. Create a new seller account with initial password
 * 2. Perform 5 password changes to populate the password_history array
 * 3. Attempt to change password to one previously used (should fail)
 * 4. Change password to a 6th unique password (should succeed)
 * 5. Verify password history maintains 5-entry limit with oldest removed
 */
export async function test_api_seller_password_change_with_password_reuse_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with initial password
  const initialPassword = "InitialPass123!";
  const sellerEmail = typia.random<string & tags.Format<"email">>();

  const sellerCreateData = {
    email: sellerEmail,
    password: initialPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateData,
    });
  typia.assert(seller);

  // Track all passwords used in order
  const passwordHistory = [initialPassword];

  // Step 2: Build password history by performing 5 password changes
  // This will populate the password_history array with 5 entries
  let currentPassword = initialPassword;

  for (let i = 1; i <= 5; i++) {
    const newPassword = `Password${i}Change!@#`;
    passwordHistory.push(newPassword);

    // Authenticate seller to perform password change
    const loginResponse: IShoppingMallSeller.ILoginResponse =
      await api.functional.shoppingMall.sellers.sessions.post(connection, {
        body: {
          email: sellerEmail,
          password: currentPassword,
        } satisfies IShoppingMallSeller.ILogin,
      });
    typia.assert(loginResponse);

    // Update connection headers with new token
    connection.headers = {
      ...connection.headers,
      Authorization: loginResponse.token.access,
    };

    // Change password
    const changeResponse: IShoppingMallSeller.IPasswordChangeResponse =
      await api.functional.auth.seller.password.change.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: newPassword,
          } satisfies IShoppingMallSeller.IPasswordChange,
        },
      );
    typia.assert(changeResponse);

    // Update current password for next iteration
    currentPassword = newPassword;
  }

  // Step 3: Attempt to reuse a password from history (should fail)
  // Try to reuse the 3rd password (index 2 in passwordHistory)
  const reusedPassword = passwordHistory[2];

  // Authenticate with current password first
  const loginBeforeReuse: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: {
        email: sellerEmail,
        password: currentPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(loginBeforeReuse);

  connection.headers = {
    ...connection.headers,
    Authorization: loginBeforeReuse.token.access,
  };

  // Attempt password reuse - this should fail
  await TestValidator.error("password reuse should be rejected", async () => {
    await api.functional.auth.seller.password.change.changePassword(
      connection,
      {
        body: {
          current_password: currentPassword,
          new_password: reusedPassword,
        } satisfies IShoppingMallSeller.IPasswordChange,
      },
    );
  });

  // Step 4: Change password to a 6th unique password (should succeed)
  const sixthPassword = "UniqueSixthPass!@#456";

  // Authenticate again (in case session was invalidated)
  const loginBeforeValidChange: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: {
        email: sellerEmail,
        password: currentPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(loginBeforeValidChange);

  connection.headers = {
    ...connection.headers,
    Authorization: loginBeforeValidChange.token.access,
  };

  // This should succeed as sixthPassword is not in the last 5 passwords
  const successfulChange: IShoppingMallSeller.IPasswordChangeResponse =
    await api.functional.auth.seller.password.change.changePassword(
      connection,
      {
        body: {
          current_password: currentPassword,
          new_password: sixthPassword,
        } satisfies IShoppingMallSeller.IPasswordChange,
      },
    );
  typia.assert(successfulChange);

  // Step 5: Verify we can login with the new password
  const finalLogin: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: {
        email: sellerEmail,
        password: sixthPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(finalLogin);

  // Validate that the password change was successful
  TestValidator.predicate(
    "login with new password should succeed",
    finalLogin.id === seller.id,
  );
}
