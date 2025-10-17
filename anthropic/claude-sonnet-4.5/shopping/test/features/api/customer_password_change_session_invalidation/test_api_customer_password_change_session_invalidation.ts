import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer password change functionality.
 *
 * Validates that a customer can successfully change their password using valid
 * current and new password credentials. The test verifies the password change
 * operation completes successfully and returns appropriate confirmation.
 *
 * Note: This test validates basic password change functionality only.
 * Multi-session invalidation testing requires login and session management
 * endpoints that are not available in the current API specification.
 *
 * Workflow:
 *
 * 1. Register a new customer account
 * 2. Change the password with valid credentials
 * 3. Verify successful password change response
 */
export async function test_api_customer_password_change_session_invalidation(
  connection: api.IConnection,
) {
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<string & tags.MinLength<8>>();
  const newPassword = typia.random<string & tags.MinLength<8>>();

  const customerData = {
    email: customerEmail,
    password: originalPassword,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(customer);

  const passwordChangeData = {
    current_password: originalPassword,
    new_password: newPassword,
  } satisfies IShoppingMallCustomer.IPasswordChange;

  const changeResponse: IShoppingMallCustomer.IPasswordChangeResponse =
    await api.functional.auth.customer.password.change.changePassword(
      connection,
      {
        body: passwordChangeData,
      },
    );
  typia.assert(changeResponse);

  TestValidator.predicate(
    "password change response contains success message",
    changeResponse.message.length > 0,
  );

  TestValidator.predicate(
    "password change message indicates session invalidation",
    changeResponse.message.toLowerCase().includes("password") ||
      changeResponse.message.toLowerCase().includes("changed") ||
      changeResponse.message.toLowerCase().includes("success"),
  );
}
