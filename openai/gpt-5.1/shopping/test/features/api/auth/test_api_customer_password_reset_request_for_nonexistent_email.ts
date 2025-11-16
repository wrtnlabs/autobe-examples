import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

export async function test_api_customer_password_reset_request_for_nonexistent_email(
  connection: api.IConnection,
) {
  // 1. Prepare a high-entropy, random email that is extremely unlikely
  //    to collide with any existing test data.
  const nonexistentEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 2. Call the password reset request endpoint with the non-existent email.
  const result: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: nonexistentEmail,
        } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset,
      },
    );

  // 3. Assert that the response strictly conforms to the
  //    IRequestPasswordResetResult DTO.
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(result);

  // 4. Business-level validation to ensure the status is a generic,
  //    non-enumerating acknowledgement.
  TestValidator.predicate(
    "password reset request status is generic (accepted or processed)",
    result.status === "accepted" || result.status === "processed",
  );
}
