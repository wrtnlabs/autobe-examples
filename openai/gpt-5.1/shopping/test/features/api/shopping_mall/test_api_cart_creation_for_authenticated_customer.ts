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

export async function test_api_cart_creation_for_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer via auth.customer.join to obtain an authorized customer
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 2. Create a new customer cart with actor_type "customer" and explicit currency_code
  const requestedCurrency = "USD";
  const createCartBody = {
    actor_type: "customer",
    currency_code: requestedCurrency,
  } satisfies IShoppingMallCart.ICreate;

  const createdCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: createCartBody,
    });
  typia.assert<IShoppingMallCart>(createdCart);

  // 3. Validate core identity and ownership semantics
  TestValidator.predicate("cart id should be a non-empty string", () => {
    return typeof createdCart.id === "string" && createdCart.id.length > 0;
  });

  TestValidator.equals(
    "cart actor_type should be 'customer'",
    createdCart.actor_type,
    "customer",
  );

  TestValidator.equals(
    "cart currency_code should match requested currency",
    createdCart.currency_code,
    requestedCurrency,
  );

  TestValidator.predicate(
    "cart status should be a non-empty string",
    () =>
      typeof createdCart.status === "string" && createdCart.status.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty ISO date-time string",
    () =>
      typeof createdCart.created_at === "string" &&
      createdCart.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty ISO date-time string",
    () =>
      typeof createdCart.updated_at === "string" &&
      createdCart.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined for a new cart",
    () =>
      createdCart.deleted_at === null || createdCart.deleted_at === undefined,
  );

  TestValidator.predicate(
    "last_validated_at should be null or undefined for a new cart",
    () =>
      createdCart.last_validated_at === null ||
      createdCart.last_validated_at === undefined,
  );

  // 4. Ownership relationship expectations
  if (
    createdCart.owner_customer !== undefined &&
    createdCart.owner_customer !== null
  ) {
    TestValidator.equals(
      "owner_customer.id should match authenticated customer id when present",
      createdCart.owner_customer.id,
      authorizedCustomer.id,
    );
  }

  TestValidator.predicate(
    "owner_guestuser should be null or undefined for customer carts",
    () =>
      createdCart.owner_guestuser === null ||
      createdCart.owner_guestuser === undefined,
  );

  // 5. Items snapshot and estimated totals should be in a sane initial state
  TestValidator.predicate(
    "items_snapshot should be empty or undefined on a fresh cart",
    () =>
      createdCart.items_snapshot === undefined ||
      createdCart.items_snapshot.length === 0,
  );

  TestValidator.predicate(
    "estimated_total_amount should be undefined or zero on a fresh empty cart",
    () =>
      createdCart.estimated_total_amount === undefined ||
      createdCart.estimated_total_amount === 0,
  );
}
