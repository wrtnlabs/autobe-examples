import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_delete_shopping_cart_item_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer user
  const customerBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerBody });
  typia.assert(customer);

  // 2. Login as the registered customer user
  const loginBody = {
    email: customer.email,
    password: "Password123!",
    href: "http://localhost/base",
    referrer: "http://localhost/referrer",
  } satisfies IShoppingMallCustomer.ILogin;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, { body: loginBody });
  typia.assert(authorizedCustomer);

  // 3. Assign customer role to the customer user by admin
  // First create admin user
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.com`,
    password: "AdminPass123!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Admin login
  const adminLoginBody = {
    email: admin.email,
    password: "AdminPass123!",
    href: "http://localhost/admin",
    referrer: "http://localhost/admin/referrer",
  } satisfies IShoppingMallAdmin.ILogin;
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(authorizedAdmin);

  // Admin context to assign role
  const userRoleBody = {
    user_id: customer.id,
    role_name: "customer",
  } satisfies IShoppingMallUserRole.ICreate;
  const roleAssignment: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleBody,
    });
  typia.assert(roleAssignment);

  // 4. Login customer again after role assignment for authorization
  const customerLoginBodyAfterRole = {
    email: customer.email,
    password: "Password123!",
    href: "http://localhost/base",
    referrer: "http://localhost/referrer",
  } satisfies IShoppingMallCustomer.ILogin;
  const authorizedCustomerAfterRole: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBodyAfterRole,
    });
  typia.assert(authorizedCustomerAfterRole);

  // 5. Create a shopping cart for the logged in customer
  const cartCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_customer_session_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies IShoppingMallShoppingCart.ICreate;
  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      { body: cartCreateBody },
    );
  typia.assert(cart);

  // 6. Add an item to the created shopping cart
  const itemCreateBody = {
    shopping_mall_product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const item: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      { cartId: cart.id, body: itemCreateBody },
    );
  typia.assert(item);

  // 7. Delete the added item from the shopping cart
  await api.functional.shoppingMall.customer.shoppingCarts.items.eraseCartItem(
    connection,
    { cartId: cart.id, itemId: item.id },
  );
}
