import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate that a customer can still change their password via the
 * authenticated password-change endpoint even after initiating a password reset
 * request.
 *
 * Business context:
 *
 * - Customers may click "forgot password" (reset flow) but still remember their
 *   current password while logged in.
 * - The platform must allow a normal authenticated password change without being
 *   blocked by an outstanding reset token.
 * - Authenticated password changes should take precedence in defining the current
 *   credential, regardless of reset tokens that may exist.
 *
 * Scenario steps:
 *
 * 1. Register a new customer via POST /auth/customer/join, capturing the
 *    IShoppingMallCustomer.IAuthorized payload and verifying its structure.
 * 2. While still authenticated (the SDK has set the Authorization header from the
 *    join response), initiate a password reset request via POST
 *    /auth/customer/password/reset/request using the same email address.
 * 3. Perform a password change via POST /auth/customer/password/change using
 *    IShoppingMallCustomerAuth.IChangePassword with the correct currentPassword
 *    and a distinct newPassword.
 * 4. Assert that the changePassword call returns a valid
 *    IShoppingMallCustomer.IAuthorized payload for the same customer.
 */
export async function test_api_customer_password_change_allows_reuse_flow_after_reset_request(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) with a known password
  const initialPassword = RandomGenerator.alphaNumeric(12);
  const email = typia.random<string & tags.Format<"email">>();
  const name = RandomGenerator.name();

  const joinBody = {
    email,
    password: initialPassword,
    name,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  // Basic sanity checks on join response
  TestValidator.equals(
    "joined email should match requested email",
    joined.email,
    email,
  );
  TestValidator.equals(
    "authorized customer summary id matches root id",
    joined.customer.id,
    joined.id,
  );

  // 2. Initiate a password reset request for the same email
  const resetRequestBody = {
    email,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    resetResult,
  );

  TestValidator.predicate(
    "reset request status should be accepted or processed",
    resetResult.status === "accepted" || resetResult.status === "processed",
  );

  // 3. Change password while still authenticated
  const newPassword = RandomGenerator.alphaNumeric(14);

  const changePasswordBody = {
    currentPassword: initialPassword,
    newPassword,
  } satisfies IShoppingMallCustomerAuth.IChangePassword;

  const changed: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.change.changePassword(
      connection,
      {
        body: changePasswordBody,
      },
    );
  typia.assert<IShoppingMallCustomer.IAuthorized>(changed);

  // 4. Validate that the changed authorization still belongs to same customer
  TestValidator.equals(
    "changed auth customer id matches original",
    changed.id,
    joined.id,
  );
  TestValidator.equals(
    "changed auth email matches original",
    changed.email,
    joined.email,
  );

  // Also validate that the nested summary still refers to same customer id
  TestValidator.equals(
    "changed customer summary id matches original",
    changed.customer.id,
    joined.customer.id,
  );
}
