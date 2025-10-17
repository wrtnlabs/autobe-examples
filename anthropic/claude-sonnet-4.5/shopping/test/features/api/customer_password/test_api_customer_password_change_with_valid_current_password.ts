import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer password change workflow with valid current password.
 *
 * This test validates that authenticated customers can successfully submit a
 * password change request with valid current and new passwords. The password
 * change API accepts the request and returns a success confirmation.
 *
 * Note: This test validates the password change API operation itself. Full
 * verification of password change effects (old password rejection, new password
 * acceptance) would require a login API which is not available in the current
 * API specification.
 *
 * Workflow steps:
 *
 * 1. Register a new customer account with initial password
 * 2. Submit password change request with correct current password and valid new
 *    password
 * 3. Validate password change success response message
 */
export async function test_api_customer_password_change_with_valid_current_password(
  connection: api.IConnection,
) {
  // Step 1: Register new customer account with initial password
  const initialPassword = "InitialPass123!";
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: initialPassword,
      name: customerName,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Submit password change request with valid current and new passwords
  const newPassword = "NewSecurePass456!";

  const changeResponse =
    await api.functional.auth.customer.password.change.changePassword(
      connection,
      {
        body: {
          current_password: initialPassword,
          new_password: newPassword,
        } satisfies IShoppingMallCustomer.IPasswordChange,
      },
    );
  typia.assert(changeResponse);

  // Step 3: Validate password change success response
  TestValidator.predicate(
    "password change response contains success message",
    changeResponse.message.length > 0,
  );
}
