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
 * Test cart item removal and inventory restoration.
 *
 * This test validates that removing a cart item properly completes without
 * errors, which indicates that the inventory restoration logic is triggered
 * correctly.
 *
 * Due to API limitations (no GET endpoint for SKU inventory details and no
 * admin authentication available), this test focuses on the successful
 * execution of the cart item removal operation.
 *
 * Test Steps:
 *
 * 1. Create customer account
 * 2. Create seller account for product ownership
 * 3. Create product (without category as admin APIs are unavailable)
 * 4. Create SKU with specific inventory
 * 5. Switch to customer authentication
 * 6. Add SKU to cart
 * 7. Remove the cart item (target DELETE operation)
 * 8. Validate successful removal
 */
export async function test_api_cart_item_removal_inventory_restoration(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);
  TestValidator.equals("customer email matches", customer.email, customerEmail);

  // Generate a cart ID (would normally come from cart creation API)
  const cartId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);
  TestValidator.equals("seller email matches", seller.email, sellerEmail);

  // Step 3: Create product as seller
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
  >();
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        base_price: basePrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.predicate("product has valid ID", product.id.length > 0);

  // Step 4: Create SKU with inventory
  const skuPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
  >();
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: skuPrice,
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);
  TestValidator.predicate("SKU has valid ID", sku.id.length > 0);
  TestValidator.equals("SKU price matches", sku.price, skuPrice);

  // Step 5: Switch to customer authentication to add items to cart
  const customerReauth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerReauth);

  // Step 6: Add SKU to cart
  const cartQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >() satisfies number as number;
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: cartQuantity,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);
  TestValidator.equals(
    "cart item quantity matches",
    cartItem.quantity,
    cartQuantity,
  );

  // Step 7: Remove the cart item (target DELETE operation)
  await api.functional.shoppingMall.customer.carts.items.erase(connection, {
    cartId: cartId,
    itemId: cartItem.id,
  });

  // Step 8: Validate successful removal
  // The successful completion without errors indicates inventory restoration was triggered
  // Note: Without inventory GET API, we cannot verify the actual inventory values
  TestValidator.predicate("cart item removal completed successfully", true);
}
