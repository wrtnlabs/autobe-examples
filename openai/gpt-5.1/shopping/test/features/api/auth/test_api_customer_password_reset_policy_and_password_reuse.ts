import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

export async function test_api_customer_password_reset_policy_and_password_reuse(
  connection: api.IConnection,
) {
  // 1. Register a new customer with a strong initial password
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const initialPassword: string = RandomGenerator.alphaNumeric(16);

  const joinBody = {
    email,
    password: initialPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  TestValidator.equals(
    "joined email must equal input email",
    joined.email,
    email,
  );

  // 2. Request password reset for the customer email
  const resetRequestBody = {
    email,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetRequestResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetRequestResult);

  TestValidator.predicate(
    "reset request status is accepted/processed",
    ["accepted", "processed"].includes(resetRequestResult.status),
  );

  // 3. Perform a password reset completion with a synthetic token and strong password
  const resetToken1: string = RandomGenerator.alphaNumeric(64);
  const newPassword1: string = RandomGenerator.alphaNumeric(20);

  const resetBody1 = {
    token: resetToken1,
    password: newPassword1,
  } satisfies IShoppingMallCustomerAuth.IResetPassword;

  const resetResult1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.reset.resetPassword(
      connection,
      {
        body: resetBody1,
      },
    );
  typia.assert(resetResult1);

  TestValidator.equals(
    "reset result email must equal joined email",
    resetResult1.email,
    joined.email,
  );

  // 4. Optionally perform a second reset with a different token and password
  const resetToken2: string = RandomGenerator.alphaNumeric(64);
  const newPassword2: string = RandomGenerator.alphaNumeric(24);

  const resetBody2 = {
    token: resetToken2,
    password: newPassword2,
  } satisfies IShoppingMallCustomerAuth.IResetPassword;

  const resetResult2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.reset.resetPassword(
      connection,
      {
        body: resetBody2,
      },
    );
  typia.assert(resetResult2);

  TestValidator.equals(
    "second reset result email must still equal joined email",
    resetResult2.email,
    joined.email,
  );
}
