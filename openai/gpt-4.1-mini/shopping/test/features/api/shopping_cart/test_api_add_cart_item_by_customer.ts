import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Comprehensive E2E test for adding an item to a customer's shopping cart.
 *
 * This test covers a multi-role interaction between customer, admin, and seller
 * including:
 *
 * - Customer registration and login
 * - Shopping cart creation for the customer
 * - Admin creation and login
 * - Category creation by admin
 * - Seller creation and login
 * - Product creation by seller under admin's category
 * - SKU creation for the product by seller
 * - Adding a SKU as a cart item to the customer's shopping cart
 *
 * Steps:
 *
 * 1. Customer joins and logs in
 * 2. Customer creates a shopping cart
 * 3. Admin joins and logs in
 * 4. Admin creates a product category
 * 5. Seller joins and logs in
 * 6. Seller creates a product assigned to the created category
 * 7. Seller creates a SKU for the product
 * 8. Customer adds the SKU as a cart item to their shopping cart
 * 9. Validate all responses properly with typia.assert and TestValidator
 */
export async function test_api_add_cart_item_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer joins
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "abcd1234";
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // Step 2: Customer login (to set proper auth headers)
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      __typename: "ILogin",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerLogin);

  // Step 3: Customer creates shopping cart
  const shoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(shoppingCart);
  TestValidator.equals(
    "shopping cart customer ID matches",
    shoppingCart.shopping_mall_customer_id,
    customer.id,
  );

  // Step 4: Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "abcd1234";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword, // For admin join, it expects a hashed password string; simulate by using password string
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 5: Admin login (to authenticate admin)
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // Step 6: Admin creates category
  const categoryCode = RandomGenerator.alphaNumeric(6);
  const categoryName = RandomGenerator.name();
  const category =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: categoryName,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals("category code matches", category.code, categoryCode);
  TestValidator.equals("category name matches", category.name, categoryName);

  // Step 7: Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "abcd1234";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password_hash: sellerPassword, // Same note about password hash
      company_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      status: "active",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 8: Seller login
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);

  // Step 9: Seller creates product
  const productCode = RandomGenerator.alphaNumeric(8);
  const productName = RandomGenerator.name();
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: seller.id,
        code: productCode,
        name: productName,
        status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);
  TestValidator.equals("product name matches", product.name, productName);

  // Step 10: Seller creates SKU for product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        sku_code: skuCode,
        price: skuPrice,
        status: "active",
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);
  TestValidator.equals("sku code matches", sku.sku_code, skuCode);
  TestValidator.equals("sku price matches", sku.price, skuPrice);

  // Step 11: Customer adds SKU as cart item
  // Switch back to customer authentication
  const switchCustomerLogin = await api.functional.auth.customer.login(
    connection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        __typename: "ILogin",
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(switchCustomerLogin);

  // Add cart item
  const quantity =
    (RandomGenerator.alphaNumeric(1)
      .split("")
      .reduce((acc, c) => acc + ((c.charCodeAt(0) % 5) + 1), 0) %
      10) +
    1; // Quantity 1-10

  const cartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.cartItems.create(
      connection,
      {
        shoppingCartId: shoppingCart.id,
        body: {
          shopping_mall_shopping_cart_id: shoppingCart.id,
          shopping_mall_sku_id: sku.id,
          quantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals(
    "cart item quantity matches",
    cartItem.quantity,
    quantity,
  );
  TestValidator.equals(
    "cart item sku id matches",
    cartItem.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "cart item shopping cart id matches",
    cartItem.shopping_mall_shopping_cart_id,
    shoppingCart.id,
  );
}
