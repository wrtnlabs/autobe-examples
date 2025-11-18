import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Validate that a customer-created cart is immediately ready for item addition
 * and that cart header fields remain consistent and logically updated across
 * customer and admin views.
 *
 * Business flow:
 *
 * 1. Register a new customer (POST /auth/customer/join) and rely on the SDK to
 *    attach the customer access token to the connection.
 * 2. As that customer, create a new cart (POST /shoppingMall/customer/carts) with
 *    actor_type="customer" and a concrete currency_code.
 * 3. Immediately add a cart item to the new cart (POST
 *    /shoppingMall/customer/carts/{cartId}/items).
 * 4. Register an admin (POST /auth/admin/join) so that admin-authorized requests
 *    can be made on the same connection.
 * 5. As the admin, fetch the cart header via GET
 *    /shoppingMall/admin/carts/{cartId} and inspect that:
 *
 *    - The cart id is unchanged.
 *    - Status and currency_code remain stable.
 *    - Items_snapshot and/or estimated_total_amount reflect the added item.
 *    - Created_at is stable and updated_at is not older than the original
 *         customer-view header.
 */
export async function test_api_customer_cart_creation_and_item_addition_readiness(
  connection: api.IConnection,
) {
  // 1. Customer registration (join) and implicit authentication
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 2. Customer cart creation
  const cartCreateBody = {
    actor_type: "customer",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const createdCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(createdCart);

  const originalCartId = createdCart.id;
  const originalCurrency = createdCart.currency_code;
  const originalStatus = createdCart.status;
  const originalCreatedAt = createdCart.created_at;
  const originalUpdatedAt = createdCart.updated_at;

  // 3. Immediately add an item to the cart
  const cartItemCreateBody = {
    shopping_mall_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const createdItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: originalCartId,
      body: cartItemCreateBody,
    });
  typia.assert(createdItem);

  TestValidator.equals(
    "cart item should belong to the created cart",
    createdItem.shopping_mall_cart_id,
    originalCartId,
  );
  TestValidator.predicate(
    "cart item quantity should be at least 1",
    createdItem.quantity >= 1,
  );

  // 4. Admin registration and implicit authentication
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 5. Admin fetches the cart header
  const adminCart: IShoppingMallCart =
    await api.functional.shoppingMall.admin.carts.at(connection, {
      cartId: originalCartId,
    });
  typia.assert(adminCart);

  TestValidator.equals(
    "admin view cart id should match created cart id",
    adminCart.id,
    originalCartId,
  );
  TestValidator.equals(
    "admin view cart currency should match created cart currency",
    adminCart.currency_code,
    originalCurrency,
  );
  TestValidator.equals(
    "admin view cart status should remain the same as customer view",
    adminCart.status,
    originalStatus,
  );

  TestValidator.equals(
    "created_at should remain stable between customer and admin views",
    adminCart.created_at,
    originalCreatedAt,
  );

  const originalUpdatedDate = new Date(originalUpdatedAt).getTime();
  const adminUpdatedDate = new Date(adminCart.updated_at).getTime();
  TestValidator.predicate(
    "admin updated_at should be greater than or equal to original updated_at",
    adminUpdatedDate >= originalUpdatedDate,
  );

  const itemsSnapshot = adminCart.items_snapshot ?? [];
  const estimatedTotal = adminCart.estimated_total_amount ?? 0;

  TestValidator.predicate(
    "cart should either have items in snapshot or a positive estimated total",
    itemsSnapshot.length >= 1 || estimatedTotal > 0,
  );

  const lastValidated = adminCart.last_validated_at ?? null;
  TestValidator.predicate(
    "last_validated_at should be either null/undefined or a non-empty string",
    lastValidated === null ||
      (typeof lastValidated === "string" && lastValidated.length > 0),
  );
}
