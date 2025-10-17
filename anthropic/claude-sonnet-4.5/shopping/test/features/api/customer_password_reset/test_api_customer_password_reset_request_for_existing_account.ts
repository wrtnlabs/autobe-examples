import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_password_reset_request_for_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a customer account to establish a valid user in the system
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerName = RandomGenerator.name();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Validate business logic - customer data matches input
  TestValidator.equals(
    "customer email should match",
    customer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer name should match",
    customer.name,
    customerName,
  );

  // Step 2: Request password reset for the existing customer account
  const resetResponse =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: customerEmail,
        } satisfies IShoppingMallCustomer.IPasswordResetRequest,
      },
    );
  typia.assert(resetResponse);

  // Step 3: Test rate limiting by submitting multiple reset requests
  // According to business requirements, maximum 3 requests per hour are allowed
  const resetRequest2 =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: customerEmail,
        } satisfies IShoppingMallCustomer.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequest2);

  const resetRequest3 =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: customerEmail,
        } satisfies IShoppingMallCustomer.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequest3);

  // Fourth request to test rate limiting boundary
  const resetRequest4 =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: customerEmail,
        } satisfies IShoppingMallCustomer.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequest4);
}
