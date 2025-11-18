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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that customer cart creation is rejected when the caller is not
 * properly authenticated as a customer or when the requested actor_type does
 * not align with the authenticated role.
 *
 * Business goals:
 *
 * 1. Anonymous callers must not be able to create carts via the
 *    /shoppingMall/customer/carts endpoint even when they provide a
 *    syntactically valid IShoppingMallCart.ICreate payload.
 * 2. A seller-authenticated session must not be able to create carts through the
 *    customer path, even if actor_type is set to "customer".
 * 3. An authenticated customer must not be able to create a cart when the
 *    actor_type is inconsistent with the customer role (e.g., "guestuser").
 *
 * Steps:
 *
 * 1. Attempt cart creation without calling any join endpoint (unauthenticated).
 * 2. Register and authenticate a seller, then attempt cart creation as that seller
 *    with actor_type "customer".
 * 3. Register and authenticate a customer, then attempt cart creation as that
 *    customer with actor_type "guestuser".
 *
 * For each negative case, we only assert that the operation fails using
 * TestValidator.error without inspecting HTTP status codes or error messages.
 */
export async function test_api_cart_creation_rejected_for_unauthenticated_or_mismatched_actor(
  connection: api.IConnection,
) {
  // 1. Unauthenticated attempt with actor_type "customer"
  const unauthCartBody = {
    actor_type: "customer",
  } satisfies IShoppingMallCart.ICreate;

  await TestValidator.error(
    "unauthenticated caller cannot create customer cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: unauthCartBody,
      });
    },
  );

  // 2. Seller-authenticated attempt with actor_type "customer"
  const sellerJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerCartBody = {
    actor_type: "customer",
  } satisfies IShoppingMallCart.ICreate;

  await TestValidator.error(
    "seller actor cannot create customer cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: sellerCartBody,
      });
    },
  );

  // 3. Customer-authenticated attempt with mismatched actor_type "guestuser"
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const mismatchedActorCartBody = {
    actor_type: "guestuser",
  } satisfies IShoppingMallCart.ICreate;

  await TestValidator.error(
    "customer cannot create cart with mismatched actor_type",
    async () => {
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: mismatchedActorCartBody,
      });
    },
  );
}
