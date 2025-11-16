import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

export async function test_api_customer_password_reset_with_expired_or_consumed_token(
  connection: api.IConnection,
) {
  // 1. Register a new customer using the join endpoint.
  const joinBody = typia.random<IShoppingMallCustomerAuth.IJoin>();

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // Preserve the customer's email for subsequent password reset request.
  const customerEmail = joinBody.email;

  // 2. Initiate a password reset request for the registered customer.
  const resetRequestResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: customerEmail,
        } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    resetRequestResult,
  );

  // 3. Attempt to complete password reset with an obviously invalid/expired token.
  //    We cannot access a real token from the DB, so we simulate an invalid or
  //    expired token by using a random opaque string that should not correspond
  //    to any valid password reset token row.
  const invalidToken: string = RandomGenerator.alphaNumeric(64);
  const newPassword: string = RandomGenerator.alphaNumeric(16);

  await TestValidator.error(
    "password reset must fail with invalid or expired token",
    async () => {
      await api.functional.auth.customer.password.reset.resetPassword(
        connection,
        {
          body: {
            token: invalidToken,
            password: newPassword,
          } satisfies IShoppingMallCustomerAuth.IResetPassword,
        },
      );
    },
  );
}
