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

/**
 * Validate that a customer can update the currency_code of an active cart.
 *
 * Business goals:
 *
 * - Ensure that a customer-authenticated connection can create a cart with
 *   actor_type="customer" and an initial currency_code.
 * - Verify that calling PUT /shoppingMall/customer/carts/{cartId} with an
 *   IShoppingMallCart.IUpdate payload that changes currency_code results in an
 *   updated cart whose currency_code reflects the new value while preserving
 *   core identity fields.
 * - Confirm that repeated currency updates on the same active cart are accepted
 *   at the API level and that other header fields stay stable when not
 *   explicitly changed.
 *
 * Technical flow:
 *
 * 1. Join as a customer using api.functional.auth.customer.join.
 * 2. Create a cart via api.functional.shoppingMall.customer.carts.create with
 *    actor_type="customer" and an explicit initial currency_code (e.g., USD).
 * 3. Call api.functional.shoppingMall.customer.carts.update to change the
 *    currency_code to a different value (e.g., EUR) and assert header-level
 *    expectations.
 * 4. Call update again to change the currency_code to a third value (e.g., KRW)
 *    and verify consistent behavior.
 */
export async function test_api_customer_cart_update_currency_for_active_cart(
  connection: api.IConnection,
) {
  // 1. Customer join - establish authenticated customer context
  const joinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create an initial cart for this customer
  const initialCurrency = "USD";
  const createBody = {
    actor_type: "customer",
    currency_code: initialCurrency,
  } satisfies IShoppingMallCart.ICreate;

  const baselineCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCart>(baselineCart);

  // Basic invariants after creation
  TestValidator.equals(
    "created cart actor_type should be 'customer'",
    baselineCart.actor_type,
    "customer",
  );
  TestValidator.equals(
    "created cart currency_code should match initialCurrency",
    baselineCart.currency_code,
    initialCurrency,
  );

  // 3. First currency update: change USD -> EUR
  const firstUpdatedCurrency = "EUR";
  const firstUpdateBody = {
    currency_code: firstUpdatedCurrency,
  } satisfies IShoppingMallCart.IUpdate;

  const updatedCart1: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: baselineCart.id,
      body: firstUpdateBody,
    });
  typia.assert<IShoppingMallCart>(updatedCart1);

  // Validate identity and unchanged header fields
  TestValidator.equals(
    "updated cart id should remain the same as baseline",
    updatedCart1.id,
    baselineCart.id,
  );
  TestValidator.equals(
    "actor_type should remain 'customer' after currency update",
    updatedCart1.actor_type,
    baselineCart.actor_type,
  );
  TestValidator.equals(
    "status should remain the same when only currency_code is updated",
    updatedCart1.status,
    baselineCart.status,
  );

  // Validate currency change
  TestValidator.equals(
    "currency_code should change to firstUpdatedCurrency",
    updatedCart1.currency_code,
    firstUpdatedCurrency,
  );
  TestValidator.notEquals(
    "updated cart after first currency change should differ from baseline",
    updatedCart1,
    baselineCart,
  );

  // 4. Second currency update: change EUR -> KRW
  const secondUpdatedCurrency = "KRW";
  const secondUpdateBody = {
    currency_code: secondUpdatedCurrency,
  } satisfies IShoppingMallCart.IUpdate;

  const updatedCart2: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: baselineCart.id,
      body: secondUpdateBody,
    });
  typia.assert<IShoppingMallCart>(updatedCart2);

  // Validate identity and stability of non-currency fields after second update
  TestValidator.equals(
    "second updated cart id should remain the same as baseline",
    updatedCart2.id,
    baselineCart.id,
  );
  TestValidator.equals(
    "actor_type should remain 'customer' after second currency update",
    updatedCart2.actor_type,
    baselineCart.actor_type,
  );
  TestValidator.equals(
    "status should remain the same after second currency update",
    updatedCart2.status,
    baselineCart.status,
  );

  // Validate second currency change
  TestValidator.equals(
    "currency_code should change to secondUpdatedCurrency",
    updatedCart2.currency_code,
    secondUpdatedCurrency,
  );
  TestValidator.notEquals(
    "second updated cart should differ from first updated cart when currency changes again",
    updatedCart2,
    updatedCart1,
  );
}
