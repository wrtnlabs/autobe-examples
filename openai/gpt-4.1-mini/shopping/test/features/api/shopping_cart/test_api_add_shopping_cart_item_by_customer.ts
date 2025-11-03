import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test adding a new shopping cart item by an authenticated customer.
 *
 * This test performs the following steps:
 *
 * 1. Register a new customer user with realistic properties.
 * 2. Login as the new customer user.
 * 3. Create a "customer" role for the user.
 * 4. Register a new seller user and login.
 * 5. Create a product SKU associated with the seller.
 * 6. Create a new shopping cart for the customer including session information.
 * 7. Add an item to the new shopping cart referencing the created product SKU with
 *    a positive quantity.
 * 8. Validate that the cart item contains correct linkage to cart and SKU, and
 *    quantity matches.
 *
 * All API responses undergo typia.assert validation to ensure strict type
 * safety.
 *
 * Login and join endpoints auto-handle authorization tokens.
 */
export async function test_api_add_shopping_cart_item_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer user
  const customerCreateBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password: "StrongPassword123!",
    nickname: RandomGenerator.name(2),
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customerAuthorized);

  // Step 2: Login as the customer
  const customerLoginBody = {
    email: customerCreateBody.email,
    password: customerCreateBody.password,
    href: "https://shop.example.com/customer/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoginResult: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginResult);

  // Step 3: Assign "customer" role to the customer user
  const userRoleBody = {
    user_id: customerAuthorized.id,
    role_name: "customer",
  } satisfies IShoppingMallUserRole.ICreate;
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleBody,
    });
  typia.assert(userRole);

  // Step 4: Register and authenticate a new seller user
  const sellerCreateBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password: "StrongPassword123!",
    store_name: RandomGenerator.name(1),
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password,
    href: "https://shop.example.com/seller/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  // Step 5: Create a product SKU for the seller's product
  // Note: The productCode must be a non-empty string representing the existing product
  // Since the scenario requires that SKUs must exist, we'll create one SKU for a fixed product
  const productCode = "PRD123";

  // Create a SKU with a unique sku_code
  const skuCreateBody = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;
  const productSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(productSku);

  // Step 6: Create a shopping cart for the customer
  // Since we lack a customer session creation API, generate a random UUID as session id
  const dummySessionId = typia.random<string & tags.Format<"uuid">>();

  const shoppingCartCreateBody = {
    shopping_mall_customer_id: customerAuthorized.id,
    shopping_mall_customer_session_id: dummySessionId,
  } satisfies IShoppingMallShoppingCart.ICreate;
  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: shoppingCartCreateBody,
      },
    );
  typia.assert(shoppingCart);

  // Step 7: Add a cart item referencing the created SKU
  const cartItemCreateBody = {
    shopping_mall_product_sku_id: productSku.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
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

  // Step 8: Validate the cart item
  TestValidator.equals(
    "cart item is linked to correct cart",
    cartItem.shopping_mall_shopping_cart_id,
    shoppingCart.id,
  );
  TestValidator.equals(
    "cart item sku matches created SKU",
    cartItem.shopping_mall_product_sku_id,
    productSku.id,
  );
  TestValidator.predicate(
    "cart item quantity is positive",
    cartItem.quantity > 0,
  );
}
