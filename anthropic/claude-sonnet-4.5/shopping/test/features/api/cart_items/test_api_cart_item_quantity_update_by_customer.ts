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
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

export async function test_api_cart_item_quantity_update_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create admin account to manage categories
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product
  const productData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 5: Create SKU with sufficient inventory
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 6: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert(customer);

  // Step 7: Generate cart ID and add initial cart item
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const initialQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItemData = {
    shopping_mall_sku_id: sku.id,
    quantity: initialQuantity,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: cartItemData,
    });
  typia.assert(cartItem);

  // Step 8: Test quantity increase
  const increasedQuantity = initialQuantity + 3;
  const updateDataIncrease = {
    quantity: increasedQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;

  const updatedItemIncrease =
    await api.functional.shoppingMall.customer.carts.items.update(connection, {
      cartId: cartId,
      itemId: cartItem.id,
      body: updateDataIncrease,
    });
  typia.assert(updatedItemIncrease);
  TestValidator.equals(
    "quantity increased successfully",
    updatedItemIncrease.quantity,
    increasedQuantity,
  );

  // Step 9: Test quantity decrease
  const decreasedQuantity = increasedQuantity - 2;
  const updateDataDecrease = {
    quantity: decreasedQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;

  const updatedItemDecrease =
    await api.functional.shoppingMall.customer.carts.items.update(connection, {
      cartId: cartId,
      itemId: cartItem.id,
      body: updateDataDecrease,
    });
  typia.assert(updatedItemDecrease);
  TestValidator.equals(
    "quantity decreased successfully",
    updatedItemDecrease.quantity,
    decreasedQuantity,
  );

  // Step 10: Test setting quantity to zero (automatic removal)
  const updateDataZero = {
    quantity: 0,
  } satisfies IShoppingMallCartItem.IUpdate;

  const removedItem =
    await api.functional.shoppingMall.customer.carts.items.update(connection, {
      cartId: cartId,
      itemId: cartItem.id,
      body: updateDataZero,
    });
  typia.assert(removedItem);
}
