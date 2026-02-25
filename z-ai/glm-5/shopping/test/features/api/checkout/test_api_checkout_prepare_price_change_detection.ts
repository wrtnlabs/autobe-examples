import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckoutPrepare } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutPrepare";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test checkout preparation detects and highlights price changes when variant prices
 * have been updated since items were added to cart.
 *
 * **Test Flow:**
 * 1. Admin creates category and approves seller
 * 2. Seller creates product with variant at initial price
 * 3. Seller adds inventory stock to variant
 * 4. Customer adds variant to cart (unit_price captured at add-time)
 * 5. Seller updates variant price (simulates price change)
 * 6. Customer prepares checkout
 * 7. Verify price change detection in response
 */
export async function test_api_checkout_prepare_price_change_detection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Setup seller connection, create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 50000,
        category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // Create variant with initial price
  const initialVariantPrice = 45000;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: initialVariantPrice,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 3. Setup customer connection and add item to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const cartQuantity = 3;
  const cartItem = await api.functional.shoppingMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        variantId: variant.id,
        quantity: cartQuantity,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Record the unit price stored in cart at add-time
  const cartUnitPrice = cartItem.unitPrice;
  // 4. Seller updates variant price (price increase scenario)
  const newVariantPrice = 55000; // Price increased by 10000
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newVariantPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Customer prepares checkout with new address
  const checkoutPrepare =
    await api.functional.shoppingMall.customer.customers.me.checkout.prepare(
      customerConnection,
      {
        body: {
          addressId: null,
          recipientName: "John Doe",
          phone: "010-1234-5678",
          street: "123 Main Street",
          city: "Seoul",
          state: "Gangnam-gu",
          postalCode: "06000",
          country: "South Korea",
        } satisfies IShoppingMallCheckoutPrepare.IRequest,
      },
    );
  typia.assert(checkoutPrepare);
  // 6. Validate price change detection
  // Checkout should be valid even with price changes
  TestValidator.predicate("checkout valid", checkoutPrepare.valid);
  // Should have exactly one item in checkout
  TestValidator.equals("items count", checkoutPrepare.items.length, 1);
  const checkoutItem = checkoutPrepare.items[0]!;
  // Unit price should reflect CURRENT variant price, not cart stored price
  TestValidator.equals(
    "unit_price reflects current variant price",
    checkoutItem.unit_price,
    newVariantPrice,
  );
  // Subtotal should be calculated with current price
  const expectedSubtotal = newVariantPrice * cartQuantity;
  TestValidator.equals(
    "subtotal calculated with current price",
    checkoutItem.subtotal,
    expectedSubtotal,
  );
  // Order subtotal should match item subtotal
  TestValidator.equals(
    "order subtotal",
    checkoutPrepare.subtotal,
    expectedSubtotal,
  );
  // Verify price change warning exists
  const hasPriceChangeWarning = checkoutPrepare.warnings.some((warning) =>
    warning.toLowerCase().includes("price"),
  );
  TestValidator.predicate(
    "price change warning present",
    hasPriceChangeWarning,
  );
  // Item should be available and in stock
  TestValidator.predicate("item in stock", checkoutItem.in_stock);
  TestValidator.predicate("item available", !checkoutItem.unavailable);
  // Verify the price actually changed
  TestValidator.notEquals(
    "cart price differs from current price",
    cartUnitPrice,
    newVariantPrice,
  );
  // Verify quantity preserved
  TestValidator.equals(
    "quantity preserved",
    checkoutItem.quantity,
    cartQuantity,
  );
}
