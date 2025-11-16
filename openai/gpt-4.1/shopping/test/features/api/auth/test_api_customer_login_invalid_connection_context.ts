import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test login attempt with malformed 'href' or 'referrer' fields (must provide
 * all required fields for type safety).
 *
 * Confirms the system rejects authentication attempts that have structurally
 * valid, but business-invalid connection context. Under AutoBE E2E policy,
 * missing required fields and type error scenarios are strictly forbidden; only
 * test business logic rejection.
 *
 * Workflow:
 *
 * 1. Register a valid customer
 * 2. Attempt to log in with intentionally invalid 'href' value (nonsensical URI
 *    string)
 * 3. Attempt to log in with intentionally invalid 'referrer' value (nonsensical
 *    URI string) (Missing required fields and malformed type test cases are not
 *    implemented, as they violate compilation safety.)
 */
export async function test_api_customer_login_invalid_connection_context(
  connection: api.IConnection,
) {
  // 1. Register a valid customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const phone = RandomGenerator.mobile();

  const auth = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      password: password as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name,
      phone,
    },
  });
  typia.assert(auth);

  // Valid values to demonstrate context
  const validHref = "https://example.com/customer/login";
  const validReferrer = "https://example.com/";

  // 2. Login with nonsensical 'href' (type valid, semantically invalid)
  await TestValidator.error(
    "login should fail with nonsensical href",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email,
          password,
          href: "not-an-actual-uri" as string & tags.Format<"uri">,
          referrer: validReferrer,
        },
      });
    },
  );

  // 3. Login with nonsensical 'referrer' (type valid, semantically invalid)
  await TestValidator.error(
    "login should fail with nonsensical referrer",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email,
          password,
          href: validHref,
          referrer: "not-an-actual-uri" as string & tags.Format<"uri">,
        },
      });
    },
  );
}
