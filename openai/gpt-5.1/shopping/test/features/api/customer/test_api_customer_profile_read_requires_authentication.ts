import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";

/**
 * Verify that customer profile reading requires authentication and only
 * succeeds for an authenticated owner connection.
 *
 * Business context:
 *
 * - Customer profiles are sensitive data stored in
 *   shopping_mall_customer_profiles and should not be exposed to
 *   unauthenticated callers.
 * - The authentication flow for a customer in this API surface is performed by
 *   POST /auth/customer/join, which both creates the account and returns an
 *   authorized payload including JWT tokens. The SDK implementation of
 *   `api.functional.auth.customer.join` also wires the issued access token into
 *   the provided connection so that subsequent calls use it automatically.
 *
 * Scenario steps:
 *
 * 1. Register a new customer via `api.functional.auth.customer.join` using a
 *    randomly generated IShoppingMallCustomerJoin.IRequest payload, capturing
 *    the resulting IShoppingMallCustomer.IAuthorized object.
 * 2. Derive the `customerId` from `authorized.id`.
 * 3. Construct a first unauthenticated connection by cloning the base connection
 *    and replacing its headers with an empty object. Using this connection,
 *    attempt to read the customer profile via
 *    `api.functional.shoppingMall.customer.customers.profile.at` and assert
 *    that the call fails using TestValidator.error.
 * 4. Construct a second unauthenticated connection in the same way and repeat the
 *    unauthorized profile read attempt, again asserting that it fails. This
 *    second attempt conceptually covers scenarios such as repeated
 *    unauthenticated access or invalid credentials without directly
 *    manipulating Authorization headers.
 * 5. Using the original, now-authenticated connection (which the join() call has
 *    enriched with a valid access token), call the profile.at endpoint with the
 *    captured customerId and assert that the call succeeds.
 * 6. Validate that the returned IShoppingMallCustomerProfile structure is correct
 *    via typia.assert and that its embedded customer summary matches the
 *    authenticated customer (id, email, status).
 */
export async function test_api_customer_profile_read_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) to obtain an authenticated actor
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const customerId: string & tags.Format<"uuid"> = authorized.id;

  // 2. First unauthenticated attempt: use a cloned connection with empty headers
  const unauthConn1: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "profile read without auth must fail (unauthConn1)",
    async () => {
      await api.functional.shoppingMall.customer.customers.profile.at(
        unauthConn1,
        {
          customerId,
        },
      );
    },
  );

  // 3. Second unauthenticated attempt: another fresh connection without headers
  const unauthConn2: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "profile read without auth must fail (unauthConn2)",
    async () => {
      await api.functional.shoppingMall.customer.customers.profile.at(
        unauthConn2,
        {
          customerId,
        },
      );
    },
  );

  // 4. Authorized attempt: use the original connection, which now carries
  //    the access token set by the join() call above.
  const profile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.at(
      connection,
      {
        customerId,
      },
    );
  typia.assert(profile);

  // 5. Basic business assertions: profile.customer must match the authorized
  //    customer identity for key fields.
  TestValidator.equals(
    "profile.customer.id matches authorized.id",
    profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile.customer.email matches authorized.email",
    profile.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "profile.customer.status matches authorized.status",
    profile.customer.status,
    authorized.status,
  );
}
