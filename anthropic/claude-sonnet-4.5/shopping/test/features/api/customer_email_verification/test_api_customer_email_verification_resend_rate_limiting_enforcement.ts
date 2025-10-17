import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_email_verification_resend_rate_limiting_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer account creating an unverified account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Create unauthenticated connection for resend requests
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 2: Request verification email resend (first request - should succeed)
  const firstResend =
    await api.functional.auth.customer.email.verify.resend.resendVerification(
      unauthConn,
      {
        body: {
          email: customerEmail,
        } satisfies IShoppingMallCustomer.IResendVerification,
      },
    );
  typia.assert(firstResend);

  TestValidator.predicate(
    "first resend request returns success message",
    firstResend.message.length > 0,
  );

  // Step 3: Immediately attempt a second resend request within 5 minutes
  // This should be rejected with HTTP 429 Too Many Requests error
  await TestValidator.error(
    "second resend within 5 minutes should fail with rate limit error",
    async () => {
      await api.functional.auth.customer.email.verify.resend.resendVerification(
        unauthConn,
        {
          body: {
            email: customerEmail,
          } satisfies IShoppingMallCustomer.IResendVerification,
        },
      );
    },
  );
}
