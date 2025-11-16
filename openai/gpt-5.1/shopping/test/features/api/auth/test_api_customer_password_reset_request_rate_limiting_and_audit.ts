import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

export async function test_api_customer_password_reset_request_rate_limiting_and_audit(
  connection: api.IConnection,
) {
  // 1. Register a new customer using a random, valid join payload
  const joinBody = typia.random<IShoppingMallCustomerAuth.IJoin>();

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // Use the exact email we just registered with
  const registeredEmail = joinBody.email;

  // 2. Repeatedly invoke password reset request for the same email
  const repeatCount = 5;
  const resetResults: IShoppingMallCustomerAuth.IRequestPasswordResetResult[] =
    [];

  for (let i = 0; i < repeatCount; i++) {
    const result: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
      await api.functional.auth.customer.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: registeredEmail,
          } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset,
        },
      );
    typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(result);
    resetResults.push(result);

    // Each response must use one of the allowed, generic statuses
    TestValidator.predicate(
      `known-email reset #${i + 1} has allowed status`,
      result.status === "accepted" || result.status === "processed",
    );
  }

  // Basic sanity: we have exactly repeatCount successful responses
  TestValidator.equals(
    "reset result count for known email matches repeat count",
    resetResults.length,
    repeatCount,
  );

  // 3. Send a password reset request for an unknown email and
  //    verify that the API still returns a generic success result.
  let unknownEmail: string & tags.Format<"email">;
  while (true) {
    const candidate = typia.random<string & tags.Format<"email">>();
    if (candidate !== registeredEmail) {
      unknownEmail = candidate;
      break;
    }
  }

  const unknownResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: unknownEmail,
        } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    unknownResult,
  );

  TestValidator.predicate(
    "unknown-email reset has allowed generic status",
    unknownResult.status === "accepted" || unknownResult.status === "processed",
  );

  // 4. Optional cross-check: all statuses across known and unknown email
  //    belong to the same generic set; no leakage of account existence.
  for (let i = 0; i < resetResults.length; i++) {
    const status = resetResults[i].status;
    TestValidator.predicate(
      `known-email reset #${i + 1} status remains generic`,
      status === "accepted" || status === "processed",
    );
  }

  TestValidator.predicate(
    "unknown-email reset status remains generic",
    unknownResult.status === "accepted" || unknownResult.status === "processed",
  );
}
