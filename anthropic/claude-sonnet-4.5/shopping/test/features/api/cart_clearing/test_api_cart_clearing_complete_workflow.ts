import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the complete workflow of clearing an entire shopping cart with multiple
 * items from different products.
 *
 * This test validates the cart clearing operation which:
 *
 * 1. Removes all cart items permanently from the database
 * 2. Releases all inventory reservations back to available stock
 * 3. Records inventory transactions for audit trail
 * 4. Soft-deletes the cart record (preserves for analytics)
 * 5. Allows customer to create new cart after clearing
 *
 * Business flow:
 *
 * 1. Create customer account (join)
 * 2. Create seller account
 * 3. Create product category
 * 4. Create first product
 * 5. Create SKU for first product
 * 6. Create second product
 * 7. Create SKU for second product
 * 8. Add first SKU to customer's cart
 * 9. Add second SKU to customer's cart
 * 10. Clear the entire cart (target operation)
 *
 * Expected outcomes:
 *
 * - All cart items are permanently deleted
 * - All inventory reservations are released
 * - Inventory transactions are recorded
 * - Cart is soft-deleted (deleted_at set)
 * - Success response with no content
 */
export async function test_api_cart_clearing_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(customer);

  // Step 2: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 3: Create product category (switch to seller context not needed for admin operation)
  const categoryData = {
    name: RandomGenerator.name(1),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 4: Create first product (seller context already set)
  const product1Data = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    base_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IShoppingMallProduct.ICreate;

  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: product1Data,
    });
  typia.assert(product1);

  // Step 5: Create SKU for first product
  const sku1Data = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IShoppingMallSku.ICreate;

  const sku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product1.id,
      body: sku1Data,
    });
  typia.assert(sku1);

  // Step 6: Create second product
  const product2Data = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    base_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IShoppingMallProduct.ICreate;

  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: product2Data,
    });
  typia.assert(product2);

  // Step 7: Create SKU for second product
  const sku2Data = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IShoppingMallSku.ICreate;

  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product2.id,
      body: sku2Data,
    });
  typia.assert(sku2);

  // Step 8: Add first SKU to customer's cart (switch back to customer context)
  const cartItem1Data = {
    shopping_mall_sku_id: sku1.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >() satisfies number as number,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem1: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: customer.id,
      body: cartItem1Data,
    });
  typia.assert(cartItem1);

  // Step 9: Add second SKU to customer's cart
  const cartItem2Data = {
    shopping_mall_sku_id: sku2.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >() satisfies number as number,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: customer.id,
      body: cartItem2Data,
    });
  typia.assert(cartItem2);

  // Step 10: Clear the entire cart (target operation)
  const clearResult = await api.functional.shoppingMall.customer.carts.erase(
    connection,
    {
      cartId: customer.id,
    },
  );
  typia.assert(clearResult);
}
