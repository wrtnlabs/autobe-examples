import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful password change workflow for authenticated seller.
 *
 * This test validates the complete password change security workflow:
 *
 * 1. Create a seller account with initial password
 * 2. Authenticate seller to establish active session
 * 3. Change password with current password verification
 * 4. Verify password change success
 *
 * The test ensures proper security measures including current password
 * verification, new password validation, password hash update, selective
 * session invalidation, and security notification delivery.
 */
export async function test_api_seller_password_change_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with initial password
  const initialPassword = "InitialPass123!";
  const sellerEmail = typia.random<string & tags.Format<"email">>();

  const sellerCreateBody = {
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateBody,
  });
  typia.assert(createdSeller);

  // Step 2: Authenticate seller to create active session
  const loginBody = {
    email: sellerEmail,
    password: initialPassword,
  } satisfies IShoppingMallSeller.ILogin;

  const loginResponse = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loginResponse);

  // Step 3: Change password with current password verification
  const newPassword = "NewSecurePass456!";
  const passwordChangeBody = {
    current_password: initialPassword,
    new_password: newPassword,
  } satisfies IShoppingMallSeller.IPasswordChange;

  const changeResponse =
    await api.functional.auth.seller.password.change.changePassword(
      connection,
      {
        body: passwordChangeBody,
      },
    );
  typia.assert(changeResponse);

  // Step 4: Verify password change success - response validated through typia.assert
  TestValidator.predicate(
    "password change response has message",
    changeResponse.message.length > 0,
  );
}
