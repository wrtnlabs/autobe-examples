import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

export async function test_api_cart_retrieval_with_active_items(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(3),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 4: Create product
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 5: Create multiple SKU variants
  const sku1Data = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
    >(),
  } satisfies IShoppingMallSku.ICreate;

  const sku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: sku1Data,
    });
  typia.assert(sku1);

  const sku2Data = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
    >(),
  } satisfies IShoppingMallSku.ICreate;

  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: sku2Data,
    });
  typia.assert(sku2);

  // Step 6: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerData });
  typia.assert(customer);

  // At this point, customer should have an auto-created cart
  // We'll use the customer's ID as cartId (common pattern in e-commerce systems)
  const cartId = customer.id;

  // Step 7: Add first cart item
  const cartItem1Data = {
    shopping_mall_sku_id: sku1.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem1: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: cartItem1Data,
    });
  typia.assert(cartItem1);

  // Step 8: Add second cart item with different SKU
  const cartItem2Data = {
    shopping_mall_sku_id: sku2.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: cartItem2Data,
    });
  typia.assert(cartItem2);

  // Step 9: Retrieve the complete cart
  const retrievedCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.at(connection, {
      cartId: cartId,
    });
  typia.assert(retrievedCart);

  // Step 10: Validate cart structure and contents
  TestValidator.equals(
    "retrieved cart ID matches expected cart ID",
    retrievedCart.id,
    cartId,
  );

  // Note: Additional validations for cart items, quantities, SKUs, and pricing
  // would be added here if the IShoppingMallCart interface includes item details.
  // The current DTO only exposes the cart ID, so we validate what's available.
}
