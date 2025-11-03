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

/**
 * This E2E test function validates the entire workflow of retrieving a specific
 * shopping cart item by referencing its unique 'itemId' and the owning cart's
 * 'cartId' within an authenticated customer context.
 *
 * The test covers the following sequence:
 *
 * 1. Register a new customer user with realistic random data.
 * 2. Log in as the customer and obtain authentication tokens.
 * 3. Create and assign the customer role to the new user through admin APIs.
 * 4. Create a fresh shopping cart associated with the authenticated customer
 *    session.
 * 5. Add at least one item with proper SKU and quantity to the shopping cart.
 * 6. Retrieve the specific cart item by 'cartId' and 'itemId'.
 * 7. Validate the cart item response data for correctness including IDs and
 *    quantities.
 *
 * Each step uses correct DTO types with precise 'satisfies' clauses ensuring
 * compile-time type safety. The method switches between admin and customer
 * authentication contexts to simulate multi-actor permissions.
 *
 * All API responses are asserted with 'typia.assert()' for full runtime data
 * validation. TestValidator validations confirm business logic integrity and
 * successful creation.
 */
export async function test_api_retrieve_shopping_cart_item_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer user
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "P@ssword1234";
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. Log in as the newly created customer to refresh authentication tokens
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    href: "https://shop.example.com/checkout",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomer.ILogin;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  // 3. Switch to admin and assign 'customer' role to the newly created customer's user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass!234",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://admin.shop.example.com/login",
    referrer: "https://admin.shop.example.com/",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  const userRoleCreateBody = {
    user_id: customerAuthorized.id,
    role_name: "customer",
  } satisfies IShoppingMallUserRole.ICreate;

  const userRole = await api.functional.shoppingMall.admin.userRoles.create(
    connection,
    {
      body: userRoleCreateBody,
    },
  );
  typia.assert(userRole);

  // 4. Switch back to customer login context before proceeding
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // 5. Create a shopping cart for this customer session
  const shoppingCartCreateBody = {
    shopping_mall_customer_id: customerAuthorized.id,
    shopping_mall_customer_session_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies IShoppingMallShoppingCart.ICreate;

  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: shoppingCartCreateBody,
      },
    );
  typia.assert(shoppingCart);

  // 6. Add an item to the shopping cart
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const quantity = Math.max(1, Math.floor(Math.random() * 5));

  const cartItemCreateBody = {
    shopping_mall_product_sku_id: skuId,
    quantity: quantity,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: shoppingCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  TestValidator.equals(
    "cartId matches after create",
    cartItem.shopping_mall_shopping_cart_id,
    shoppingCart.id,
  );
  TestValidator.equals(
    "SKU ID matches after create",
    cartItem.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals(
    "quantity matches after create",
    cartItem.quantity,
    quantity,
  );

  // 7. Retrieve the cart item by cartId and itemId
  const readCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.at(
      connection,
      {
        cartId: shoppingCart.id,
        itemId: cartItem.id,
      },
    );
  typia.assert(readCartItem);

  TestValidator.equals("id matches on retrieval", readCartItem.id, cartItem.id);
  TestValidator.equals(
    "cartId matches on retrieval",
    readCartItem.shopping_mall_shopping_cart_id,
    shoppingCart.id,
  );
  TestValidator.equals(
    "SKU ID matches on retrieval",
    readCartItem.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals(
    "quantity matches on retrieval",
    readCartItem.quantity,
    quantity,
  );
}
