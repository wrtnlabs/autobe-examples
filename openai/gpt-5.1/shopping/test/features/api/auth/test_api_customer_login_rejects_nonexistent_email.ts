import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";

export async function test_api_customer_login_rejects_nonexistent_email(
  connection: api.IConnection,
) {
  /**
   * Scenario
   *
   * - Prepare an unauthenticated connection based on the incoming connection but
   *   with empty headers so that any existing Authorization token from other
   *   tests does not interfere with this case.
   * - Construct a login payload using a randomly generated email, a dummy
   *   password, and valid href and referrer URIs that satisfy
   *   IShoppingMallCustomerLogin.IRequest.
   * - Call api.functional.auth.customer.login with that payload and verify that
   *   it fails with an error (because there is no customer with that email),
   *   using TestValidator.error to ensure the call throws and no
   *   IShoppingMallCustomer.IAuthorized payload is produced.
   *
   * Note
   *
   * - Due to global constraints, the test does not inspect or assert on
   *   connection.headers and focuses solely on the business behavior that login
   *   with a non-existent email is rejected.
   */

  // 1. Prepare an isolated, unauthenticated connection instance so we can
  //    attempt login without relying on any pre-existing authentication.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Build a login request body with a guaranteed-random email and valid
  //    URI-form href/referrer fields.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const body = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  // 3. Attempt login and ensure it fails with an error, i.e., no
  //    IShoppingMallCustomer.IAuthorized is returned for a non-existent email.
  await TestValidator.error(
    "nonexistent customer email login must fail",
    async () => {
      await api.functional.auth.customer.login(unauthConn, { body });
    },
  );
}
