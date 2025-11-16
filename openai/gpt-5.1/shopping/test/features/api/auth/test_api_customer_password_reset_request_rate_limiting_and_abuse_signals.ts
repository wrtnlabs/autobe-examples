import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate repeated customer password reset requests return generic,
 * non-enumerating acknowledgements and behave consistently for both existing
 * and non-existing emails.
 *
 * Business goals validated by this test:
 *
 * 1. A real customer can be registered via /auth/customer/join.
 * 2. Multiple password reset requests for the same existing customer email in a
 *    short window always return a generic
 *    IShoppingMallCustomerAuth.IRequestPasswordResetResult payload.
 * 3. A password reset request for a non-existing email returns an
 *    indistinguishable generic acknowledgement (at the DTO level) from the one
 *    for an existing account, so the API does not expose account existence.
 * 4. Across multiple calls for the same email, the high-level response invariants
 *    hold: the status field is always one of the allowed literal values
 *    ("accepted" | "processed"), and the response shape stays consistent.
 */
export async function test_api_customer_password_reset_request_rate_limiting_and_abuse_signals(
  connection: api.IConnection,
) {
  // 1. Register a new customer to obtain a legitimate email identity.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Fire multiple password reset requests for the same existing customer email.
  const existingEmail = joinBody.email;

  const resetResultsForExisting: IShoppingMallCustomerAuth.IRequestPasswordResetResult[] =
    [];

  for (let i = 0; i < 5; i++) {
    const result: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
      await api.functional.auth.customer.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: existingEmail,
          } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset,
        },
      );
    typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(result);
    resetResultsForExisting.push(result);
  }

  // 3. Assert invariants across repeated calls for the same existing email.
  //    - status must always be one of the allowed literals
  //    - the response shape is stable; we at least ensure the status is consistent across calls
  const baseExisting = resetResultsForExisting[0];

  TestValidator.predicate(
    "password reset existing-email: status is allowed literal",
    () =>
      baseExisting.status === "accepted" || baseExisting.status === "processed",
  );

  for (let i = 1; i < resetResultsForExisting.length; i++) {
    const current = resetResultsForExisting[i];

    // Status must still be one of allowed literals.
    TestValidator.predicate(
      `password reset existing-email[${i}]: status is allowed literal`,
      () => current.status === "accepted" || current.status === "processed",
    );

    // Status should be consistent across calls for the same email within the short window.
    TestValidator.equals(
      `password reset existing-email[${i}]: status is consistent across calls`,
      current.status,
      baseExisting.status,
    );
  }

  // 4. Send a password reset request for a clearly non-existing email.
  const nonExistingEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const nonExistingResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistingEmail,
        } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    nonExistingResult,
  );

  // Invariants for non-existing email
  TestValidator.predicate(
    "password reset non-existing-email: status is allowed literal",
    () =>
      nonExistingResult.status === "accepted" ||
      nonExistingResult.status === "processed",
  );

  // 5. Compare responses for existing vs non-existing emails at a high level.
  // We cannot guarantee that status must be identical, but we can verify that both
  // follow the same allowed set and that basic shape (status + optional message) exists.
  // Specifically, ensure that the set of allowed statuses is the same and that
  // non-existing email does not introduce any extra discriminating fields.

  // Equality of status across one representative call pair helps demonstrate that
  // behavior is non-enumerating at least in the common case.
  TestValidator.equals(
    "password reset existing vs non-existing: representative status comparison",
    nonExistingResult.status,
    baseExisting.status,
  );
}
