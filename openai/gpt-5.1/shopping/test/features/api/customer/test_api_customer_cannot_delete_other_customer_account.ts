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

export async function test_api_customer_cannot_delete_other_customer_account(
  connection: api.IConnection,
) {
  // 1. Prepare join request bodies for Customer B and Customer A
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPassword = typia.random<string & tags.Format<"password">>();
  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword,
    // Explicitly set ip as null (allowed) to simplify, and provide realistic URLs
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPassword = typia.random<string & tags.Format<"password">>();
  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  // 2. Register Customer B first
  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBAuthorized);

  const customerBId = customerBAuthorized.id;

  // 3. Register Customer A second (connection now authenticated as A)
  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAAuthorized);

  const customerAId = customerAAuthorized.id;

  // Sanity check: A and B must be distinct customers
  TestValidator.notEquals(
    "customer A and B must be different accounts",
    customerAId,
    customerBId,
  );

  // 4. As Customer A, attempt to delete Customer B's account
  await TestValidator.error(
    "customer must not be able to delete another customer's account",
    async () => {
      await api.functional.shoppingMall.customer.customers.erase(connection, {
        customerId: customerBId,
      });
    },
  );

  // 5. Re-authenticate as Customer B to ensure B still exists and is active
  const customerBAuthorizedAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBAuthorizedAgain);

  // Optional sanity check: same id as original B
  TestValidator.equals(
    "re-joined Customer B should have same id as original B (if backend uses unique email)",
    customerBAuthorizedAgain.id,
    customerBId,
  );

  // 6. As Customer B, create a cart to prove B's account remains fully operational
  const cartCreateBody = {
    actor_type: "customer",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // Basic logical validations on the created cart
  TestValidator.equals(
    "cart actor_type should be customer",
    cart.actor_type,
    "customer",
  );
  TestValidator.predicate(
    "cart id should be a non-empty string",
    typeof cart.id === "string" && cart.id.length > 0,
  );
}
