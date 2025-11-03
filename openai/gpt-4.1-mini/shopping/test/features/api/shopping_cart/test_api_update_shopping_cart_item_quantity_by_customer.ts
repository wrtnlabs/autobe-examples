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
 * Validate updating quantity of an existing shopping cart item by an
 * authenticated customer.
 *
 * This test covers the full flow from customer registration and login, to role
 * assignment, as well as shopping cart creation and adding items before
 * updating the quantity. It also handles multi-actor authentication including
 * admin and customer for role assignment and confirms the system enforces
 * proper quantity constraints and reflects state correctly.
 *
 * Steps:
 *
 * 1. Customer joins the system with email, password, and nickname.
 * 2. Customer logs in and obtains credentials.
 * 3. Admin registers and logs in.
 * 4. Admin assigns 'customer' role to the customer user.
 * 5. Customer creates a shopping cart.
 * 6. Customer adds a product SKU item to the cart.
 * 7. Customer updates the quantity of the cart item.
 * 8. Validations performed on updated quantity and returned data.
 *
 * This test ensures robust type safety via typia assertions and business rule
 * validations via TestValidator, demonstrating seamless full user flow and
 * system integration.
 */
export async function test_api_update_shopping_cart_item_quantity_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = "1234";
  const customerNickname = RandomGenerator.name();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        nickname: customerNickname,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Customer login
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "http://localhost/",
        referrer: "http://localhost/",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLoggedIn);

  // 3. Admin registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  const adminFullName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 4. Admin login
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "http://localhost/",
        referrer: "http://localhost/",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 5. Assign 'customer' role to customer user
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: customer.id,
        role_name: "customer",
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(userRole);

  // 6. Customer creates a shopping cart
  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_customer_session_id: customer.token.access, // Use access token as session id for demo;
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(shoppingCart);

  // 7. Customer adds a product SKU item to cart
  // As no product SKU details are available from inputs, simulate a UUID for the SKU
  const productSkuId = typia.random<string & tags.Format<"uuid">>();
  const initialQuantity = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: shoppingCart.id,
        body: {
          shopping_mall_product_sku_id: productSkuId,
          quantity: initialQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 8. Customer updates quantity of the cart item
  const updatedQuantity = 3 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const updatedCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.updateCartItem(
      connection,
      {
        cartId: shoppingCart.id,
        itemId: cartItem.id,
        body: {
          quantity: updatedQuantity,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);

  // 9. Validate updated quantity and identifiers
  TestValidator.equals(
    "updated cart item quantity matches",
    updatedCartItem.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "cart ID remains the same",
    updatedCartItem.shopping_mall_shopping_cart_id,
    shoppingCart.id,
  );
  TestValidator.equals(
    "cart item ID remains the same",
    updatedCartItem.id,
    cartItem.id,
  );
  TestValidator.equals(
    "product SKU ID remains the same",
    updatedCartItem.shopping_mall_product_sku_id,
    productSkuId,
  );
}
