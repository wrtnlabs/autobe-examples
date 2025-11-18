import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";

/**
 * Verify that customer profile privacy is enforced so that a customer can read
 * only their own profile and is forbidden from reading another customer's
 * profile.
 *
 * Business context: The shopping mall platform exposes a customer-facing
 * profile endpoint GET /shoppingMall/customer/customers/{customerId}/profile
 * that should only be accessible to the owning customer (or to privileged
 * actors not covered in this test). This test ensures that a regular customer
 * cannot cross-read another customer's profile while still being able to access
 * their own profile.
 *
 * Scenario steps (feasibility-adjusted):
 *
 * 1. Register Customer A using POST /auth/customer/join and capture the returned
 *    IShoppingMallCustomer.IAuthorized structure.
 * 2. Optionally initialize Customer A's cart using POST
 *    /shoppingMall/customer/carts to ensure customer context is usable in
 *    typical flows.
 * 3. Register Customer B similarly and capture its
 *    IShoppingMallCustomer.IAuthorized. After this step, the connection's
 *    Authorization token corresponds to Customer B, because the last join
 *    overwrites the header.
 * 4. Optionally initialize Customer B's cart.
 * 5. With Customer B authenticated, perform a successful self-profile read by
 *    calling api.functional.shoppingMall.customer.customers.profile.at with
 *    customerId = customerB.id. Validate the returned
 *    IShoppingMallCustomerProfile and assert that profile.customer.id and
 *    profile.customer.email match Customer B's identity.
 * 6. Still under Customer B's authentication, attempt to read Customer A's profile
 *    by calling profile.at with customerId = customerA.id inside
 *    TestValidator.error, asserting that cross-customer access is rejected.
 *
 * Notes:
 *
 * - Each customer is joined exactly once to avoid violating the documented unique
 *   email constraint on shopping_mall_customers.email.
 * - The test thus focuses on one direction (B self-read success and B→A
 *   cross-read failure), which is sufficient to validate the core privacy
 *   boundary requirement in a reliable way.
 * - All request bodies are strongly typed using `satisfies` against the correct
 *   DTOs, and all non-void responses are validated with typia.assert.
 */
export async function test_api_customer_cannot_read_other_customer_profile(
  connection: api.IConnection,
) {
  // 1. Register Customer A via /auth/customer/join
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyA,
    });
  typia.assert(customerA);

  // 2. Optionally initialize Customer A's cart (actor_type: "customer")
  const cartBodyA = {
    actor_type: "customer",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cartA: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBodyA,
    });
  typia.assert(cartA);

  // 3. Register Customer B via /auth/customer/join
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyB,
    });
  typia.assert(customerB);

  // 4. Optionally initialize Customer B's cart
  const cartBodyB = {
    actor_type: "customer",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cartB: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBodyB,
    });
  typia.assert(cartB);

  // From here on, the active Authorization header on the connection belongs to
  // Customer B, because the last join() call set token.access for B.

  // 5. Customer B reads their own profile successfully
  const profileB: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.at(
      connection,
      {
        customerId: customerB.id,
      },
    );
  typia.assert(profileB);

  TestValidator.equals(
    "customer B profile belongs to B (id)",
    profileB.customer.id,
    customerB.id,
  );

  TestValidator.equals(
    "customer B profile email matches authorized email",
    profileB.customer.email,
    customerB.email,
  );

  // 6. Customer B must not be able to read Customer A's profile
  await TestValidator.error(
    "customer B cannot read customer A profile",
    async () => {
      await api.functional.shoppingMall.customer.customers.profile.at(
        connection,
        {
          customerId: customerA.id,
        },
      );
    },
  );
}
