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

export async function test_api_cart_creation_with_custom_currency_and_status(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) to obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Explicitly set ip to null to let server derive it (as allowed in DTO)
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 2. Create a cart with explicit non-default currency and status
  const actorType = "customer";
  const customCurrency = "EUR";
  const customStatus = "pending";
  const assumedDefaultStatus = "active";

  const cartCreateBody = {
    actor_type: actorType,
    status: customStatus,
    currency_code: customCurrency,
  } satisfies IShoppingMallCart.ICreate;

  const createdCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(createdCart);

  // 3. Validate that the server honored the client-provided configuration
  TestValidator.equals(
    "cart actor_type should match requested",
    createdCart.actor_type,
    actorType,
  );

  TestValidator.equals(
    "cart currency_code should match requested custom currency",
    createdCart.currency_code,
    customCurrency,
  );

  TestValidator.equals(
    "cart status should match requested custom status",
    createdCart.status,
    customStatus,
  );

  TestValidator.notEquals(
    "cart status should not fall back to assumed default status",
    createdCart.status,
    assumedDefaultStatus,
  );

  // Audit field expectations: created_at and updated_at existence/type are
  // fully validated by typia.assert above. Here we just enforce business
  // expectation that deleted_at is null for a fresh cart.
  TestValidator.equals(
    "newly created cart should not be soft-deleted (deleted_at null)",
    createdCart.deleted_at,
    null,
  );

  // Ensure that the cart is associated with some owner context.
  // For a customer-created cart, owner_customer may or may not be populated
  // depending on implementation, so we do not assert on it here. We only
  // assert that we got a valid id back as part of the cart header itself.
  TestValidator.predicate(
    "cart id must be a non-empty string",
    createdCart.id.length > 0,
  );
}
