import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

export async function test_api_customer_email_verify_with_invalid_or_expired_token(
  connection: api.IConnection,
) {
  // 1. Create a baseline customer via /auth/customer/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-verify-invalid-token",
    name: RandomGenerator.name(),
    // ip is optional; let server infer if omitted
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // Ensure the newly joined customer is not yet email-verified (undefined or false)
  TestValidator.predicate(
    "joined customer should start as not email-verified",
    () =>
      authorizedCustomer.isVerified === undefined ||
      authorizedCustomer.isVerified === false,
  );

  // 2. Prepare invalid token variants
  const invalidTokens: string[] = [
    // Completely random opaque string; extremely unlikely to match any stored token
    RandomGenerator.alphaNumeric(64),
    // A different random token for variety
    RandomGenerator.alphaNumeric(80),
  ];

  // 3. For each invalid token, verify that /auth/customer/email/verify fails
  for (const token of invalidTokens) {
    const verifyBody = {
      token,
    } satisfies IShoppingMallCustomerAuth.IVerifyEmail;

    await TestValidator.error(
      "email verification must fail for invalid or non-existent token",
      async () => {
        await api.functional.auth.customer.email.verify.verifyEmail(
          connection,
          {
            body: verifyBody,
          },
        );
      },
    );
  }

  // 4. We cannot directly query customer state, but we at least ensure that
  //    no successful IShoppingMallCustomer.IAuthorized payload is produced for
  //    the invalid tokens because every verifyEmail attempt above is asserted
  //    to throw. The absence of any successful verifyEmail response implies
  //    that no new session was issued for those invalid tokens.
}
