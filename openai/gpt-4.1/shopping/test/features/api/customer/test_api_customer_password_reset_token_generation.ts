import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Verify that a customer can initiate a password reset request via the
 * reset-request endpoint, and that the response structure and privacy
 * requirements are upheld.
 *
 * Workflow:
 *
 * 1. Register a new customer (join) using random, valid data.
 * 2. Initiate a password reset request for that email.
 * 3. Assert that the API response matches
 *    IShoppingCustomer.IPasswordResetInitiated.
 * 4. Confirm that response.confirmation is true, and no info about email existence
 *    is leaked.
 * 5. (Note: No audit log or token expiry can be validated directly here, but
 *    comments note business expectations.)
 */
export async function test_api_customer_password_reset_token_generation(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> & tags.MaxLength<128> =
    typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>();
  const name: string & tags.MinLength<1> & tags.MaxLength<100> =
    RandomGenerator.name(2).substring(0, 100);
  const phone: string & tags.MinLength<7> & tags.MaxLength<20> =
    RandomGenerator.mobile();
  const href: string & tags.Format<"uri"> =
    "https://shop.example.com/auth/register";
  const referrer: string & tags.Format<"uri"> = "https://shop.example.com/";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      password,
      name,
      phone,
      href,
      referrer,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);
  TestValidator.equals(
    "registered customer email matches input",
    customer.email,
    email,
  );
  TestValidator.predicate(
    "registered customer is active",
    customer.is_active === true,
  );

  // 2. Initiate a password reset request for that customer
  const resetResponse =
    await api.functional.auth.customer.password.reset_request.requestPasswordReset(
      connection,
      {
        body: {
          request_email: email,
        } satisfies IShoppingCustomer.IRequestPasswordReset,
      },
    );

  // 3. Assert response type
  typia.assert(resetResponse);

  // 4. Confirm privacy-preserving response
  TestValidator.equals(
    "password reset request response confirmation is always true",
    resetResponse.confirmation,
    true,
  );
}
