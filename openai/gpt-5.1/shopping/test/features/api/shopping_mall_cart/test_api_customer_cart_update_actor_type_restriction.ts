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

export async function test_api_customer_cart_update_actor_type_restriction(
  connection: api.IConnection,
) {
  // 1. Register a customer and obtain authorized context
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequest,
    });
  typia.assert(customer);

  // 2. Create a customer-owned cart with actor_type="customer" and a currency
  const createBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const originalCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: createBody,
    });
  typia.assert(originalCart);

  // Sanity checks on created cart
  TestValidator.equals(
    "created cart actor_type should be 'customer'",
    originalCart.actor_type,
    "customer",
  );
  TestValidator.equals(
    "created cart currency_code should match request",
    originalCart.currency_code,
    createBody.currency_code,
  );

  const originalId = originalCart.id;
  const originalCreatedAt = originalCart.created_at;
  const originalActorType = originalCart.actor_type;
  const originalOwnerCustomer = originalCart.owner_customer ?? null;
  const originalOwnerGuest = originalCart.owner_guestuser ?? null;

  // 3. Attempt to change actor_type via update to an inappropriate value
  const invalidUpdateBody = {
    actor_type: "guestuser",
    // keep other fields same for realism
    status: originalCart.status,
    currency_code: originalCart.currency_code,
  } satisfies IShoppingMallCart.IUpdate;

  // We don’t know whether the backend rejects or ignores actor_type changes.
  // Implement both patterns:
  //   - First, try the update normally.
  //   - If it throws, we assert via TestValidator.error in a separate branch.

  let updatedCart: IShoppingMallCart | null = null;

  try {
    updatedCart = await api.functional.shoppingMall.customer.carts.update(
      connection,
      {
        cartId: originalCart.id,
        body: invalidUpdateBody,
      },
    );
    typia.assert(updatedCart);
  } catch {
    updatedCart = null;
  }

  if (updatedCart === null) {
    // Case A: Backend rejects the invalid actor_type change.
    await TestValidator.error(
      "updating actor_type from 'customer' to 'guestuser' should fail or be rejected",
      async () => {
        await api.functional.shoppingMall.customer.carts.update(connection, {
          cartId: originalCart.id,
          body: invalidUpdateBody,
        });
      },
    );

    // Identity fields must remain unchanged; re-fetch via a no-op update
    const noopUpdateBody = {
      status: originalCart.status,
      currency_code: originalCart.currency_code,
    } satisfies IShoppingMallCart.IUpdate;

    const reloadedCart =
      await api.functional.shoppingMall.customer.carts.update(connection, {
        cartId: originalCart.id,
        body: noopUpdateBody,
      });
    typia.assert(reloadedCart);

    TestValidator.equals(
      "cart id should remain unchanged after rejected actor_type update",
      reloadedCart.id,
      originalId,
    );
    TestValidator.equals(
      "cart created_at should remain unchanged after rejected actor_type update",
      reloadedCart.created_at,
      originalCreatedAt,
    );
    TestValidator.equals(
      "cart actor_type should still be the original customer type",
      reloadedCart.actor_type,
      originalActorType,
    );
    TestValidator.equals(
      "owner_customer summary should remain unchanged after rejected actor_type update",
      reloadedCart.owner_customer ?? null,
      originalOwnerCustomer,
    );
    TestValidator.equals(
      "owner_guestuser summary should remain unchanged and typically null",
      reloadedCart.owner_guestuser ?? null,
      originalOwnerGuest,
    );
  } else {
    // Case B: Backend accepts update but ignores actor_type changes.

    TestValidator.equals(
      "cart id must remain unchanged after actor_type update attempt",
      updatedCart.id,
      originalId,
    );
    TestValidator.equals(
      "cart created_at must remain unchanged after actor_type update attempt",
      updatedCart.created_at,
      originalCreatedAt,
    );

    TestValidator.equals(
      "actor_type should remain 'customer' even when 'guestuser' is sent in update",
      updatedCart.actor_type,
      originalActorType,
    );

    TestValidator.equals(
      "owner_customer summary should remain associated with the cart",
      updatedCart.owner_customer ?? null,
      originalOwnerCustomer,
    );

    TestValidator.equals(
      "owner_guestuser summary should remain unchanged (usually null)",
      updatedCart.owner_guestuser ?? null,
      originalOwnerGuest,
    );

    TestValidator.equals(
      "currency_code should remain the same as original after actor_type update attempt",
      updatedCart.currency_code,
      originalCart.currency_code,
    );
  }
}
