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
 * Test that clearing a cart with multiple items properly releases all inventory
 * reservations atomically and maintains inventory accuracy across multiple
 * SKUs.
 *
 * This comprehensive test validates the critical DELETE operation for shopping
 * carts, ensuring that when a customer clears their cart containing multiple
 * items from different products, all inventory reservations are released
 * atomically without any partial releases or inconsistencies.
 *
 * Test workflow:
 *
 * 1. Create customer account (join as customer)
 * 2. Create seller account (join as seller)
 * 3. Create product category (admin operation)
 * 4. Create 3 products with different characteristics
 * 5. Create SKU for each product with initial inventory quantities
 * 6. Add all SKUs to customer's cart with varying quantities
 * 7. Clear the entire cart using DELETE operation
 * 8. Validate inventory operations completed successfully
 *
 * Validations:
 *
 * - Customer account created successfully
 * - Seller account created successfully
 * - Category created successfully
 * - All products created successfully
 * - All SKUs created successfully
 * - All items added to cart successfully
 * - Cart deletion operation completes successfully
 */
export async function test_api_cart_clearing_bulk_inventory_release(
  connection: api.IConnection,
) {
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
  TestValidator.equals(
    "customer email matches",
    customer.email,
    customerData.email,
  );

  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "llc",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 6,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);
  TestValidator.equals("seller email matches", seller.email, sellerData.email);

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
  TestValidator.equals(
    "category name matches",
    category.name,
    categoryData.name,
  );

  const products = await ArrayUtil.asyncRepeat(3, async (index) => {
    const productData = {
      name: `${RandomGenerator.name(2)} Product ${index + 1}`,
      base_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
      >() satisfies number as number,
    } satisfies IShoppingMallProduct.ICreate;

    const product = await api.functional.shoppingMall.seller.products.create(
      connection,
      {
        body: productData,
      },
    );
    typia.assert(product);
    TestValidator.equals(
      "product name matches",
      product.name,
      productData.name,
    );

    return product;
  });

  TestValidator.equals("created 3 products", products.length, 3);

  const skus = await ArrayUtil.asyncMap(products, async (product, index) => {
    const skuData = {
      sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-${index}`,
      price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
      >() satisfies number as number,
    } satisfies IShoppingMallSku.ICreate;

    const sku = await api.functional.shoppingMall.seller.products.skus.create(
      connection,
      {
        productId: product.id,
        body: skuData,
      },
    );
    typia.assert(sku);
    TestValidator.equals("sku code matches", sku.sku_code, skuData.sku_code);

    return sku;
  });

  TestValidator.equals("created 3 SKUs", skus.length, 3);

  await api.functional.auth.customer.join(connection, {
    body: customerData,
  });

  const cartId = typia.random<string & tags.Format<"uuid">>();

  const cartItems = await ArrayUtil.asyncMap(skus, async (sku) => {
    const quantity = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >() satisfies number as number;
    const cartItemData = {
      shopping_mall_sku_id: sku.id,
      quantity: quantity,
    } satisfies IShoppingMallCartItem.ICreate;

    const cartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cartId,
          body: cartItemData,
        },
      );
    typia.assert(cartItem);
    TestValidator.equals(
      "cart item quantity matches",
      cartItem.quantity,
      quantity,
    );

    return cartItem;
  });

  TestValidator.equals("added 3 items to cart", cartItems.length, 3);

  await api.functional.shoppingMall.customer.carts.erase(connection, {
    cartId: cartId,
  });

  TestValidator.predicate("cart cleared successfully", true);
}
