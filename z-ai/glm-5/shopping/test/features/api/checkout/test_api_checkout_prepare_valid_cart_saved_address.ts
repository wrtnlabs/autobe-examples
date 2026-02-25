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

export async function test_api_checkout_prepare_valid_cart_saved_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin to approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin approves the seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // 4. Create category for product
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 6. Seller creates product variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 15000,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 7. Add more inventory to ensure sufficient stock
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity: 50,
        reason: "Additional restock for testing",
      },
    },
  );
  // 8. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 9. Customer adds item to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItem);
  // 10. Customer prepares checkout with shipping address
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
        },
      },
    );
  typia.assert(checkoutPrepare);
  // 11. Validate response
  TestValidator.equals("checkout is valid", checkoutPrepare.valid, true);
  TestValidator.predicate(
    "has at least one item",
    checkoutPrepare.items.length > 0,
  );
  // Validate item details
  const item = checkoutPrepare.items[0];
  TestValidator.equals("item is in stock", item.in_stock, true);
  TestValidator.equals("item is available", item.unavailable, false);
  TestValidator.equals("quantity matches", item.quantity, 3);
  TestValidator.equals("unit price is correct", item.unit_price, 15000);
  TestValidator.equals("subtotal is correct", item.subtotal, 45000);
  TestValidator.predicate("stock is sufficient", item.stock >= item.quantity);
  TestValidator.equals(
    "variant SKU matches",
    item.variant_sku_code,
    variant.skuCode,
  );
  // Validate seller info
  TestValidator.predicate(
    "seller has valid id",
    item.seller.id === sellerAuth.id,
  );
  TestValidator.equals(
    "seller is approved",
    item.seller.approvalStatus,
    "approved",
  );
  // Validate checkout totals
  TestValidator.equals(
    "subtotal matches item total",
    checkoutPrepare.subtotal,
    45000,
  );
  TestValidator.predicate(
    "warnings is array",
    Array.isArray(checkoutPrepare.warnings),
  );
  // Validate variant options
  TestValidator.predicate(
    "has variant options",
    item.variant_options.length === 2,
  );
  const colorOption = item.variant_options.find((opt) => opt.key === "color");
  const sizeOption = item.variant_options.find((opt) => opt.key === "size");
  TestValidator.predicate("color option exists", colorOption !== undefined);
  TestValidator.equals("color value is correct", colorOption!.value, "Red");
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  TestValidator.equals("size value is correct", sizeOption!.value, "Large");
}
