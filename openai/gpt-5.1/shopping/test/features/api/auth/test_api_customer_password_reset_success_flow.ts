import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

export async function test_api_customer_password_reset_success_flow(
  connection: api.IConnection,
) {
  // 1. Register a new customer via /auth/customer/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "InitialPassword!123",
    name: RandomGenerator.name(),
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
  TestValidator.predicate(
    "joined customer id should be non-empty uuid string",
    joined.id.length > 0,
  );
  TestValidator.equals(
    "joined email should match input email",
    joined.email,
    joinBody.email,
  );

  // 2. Request password reset for the same email
  const requestResetBody = {
    email: joinBody.email,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetRequestResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: requestResetBody,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    resetRequestResult,
  );

  // Sanity check on reset request acknowledgement
  TestValidator.predicate(
    "password reset request status should be accepted or processed",
    resetRequestResult.status === "accepted" ||
      resetRequestResult.status === "processed",
  );

  // 3. Simulate retrieval of the password reset token
  // In a full E2E environment, this token would be loaded from DB or email.
  const simulatedToken: string = RandomGenerator.alphaNumeric(64);

  // 4. Complete password reset using /auth/customer/password/reset
  const newPassword = "NewStrongPassword!456";
  const resetBody = {
    token: simulatedToken,
    password: newPassword,
  } satisfies IShoppingMallCustomerAuth.IResetPassword;

  const resetAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.reset.resetPassword(
      connection,
      {
        body: resetBody,
      },
    );
  typia.assert<IShoppingMallCustomer.IAuthorized>(resetAuthorized);

  // 5. Validate that the reset response looks like a fresh authorization
  TestValidator.equals(
    "reset authorized customer id should equal joined customer id",
    resetAuthorized.id,
    joined.id,
  );
  TestValidator.equals(
    "reset authorized customer email should equal joined email",
    resetAuthorized.email,
    joined.email,
  );

  // Token object sanity checks
  const token: IAuthorizationToken = resetAuthorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token string should be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token string should be non-empty",
    token.refresh.length > 0,
  );

  // Customer summary should be consistent with root identity
  const summary = resetAuthorized.customer;
  TestValidator.equals(
    "summary id should equal root customer id",
    summary.id,
    resetAuthorized.id,
  );
}
