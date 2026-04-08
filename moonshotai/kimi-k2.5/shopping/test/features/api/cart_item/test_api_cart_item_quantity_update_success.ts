import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_cart_item_quantity_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Step 2: Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 3: Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 4: Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Step 5: Create product as seller with the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: { categoryId: category.id } as any,
    },
  );
  typia.assert(product);
  // Step 6: Create product variant as seller
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(6)}`,
          price: typia.random<number & tags.Minimum<0>>(),
          options: [{ optionName: "Color", optionValue: "Red" }],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Step 7: Add variant to customer cart
  const initialQuantity = 1;
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: initialQuantity,
        } as any,
      },
    );
  typia.assert(cartItem);
  const originalUpdatedAt = cartItem.updatedAt;
  // Step 8: Update cart item quantity
  const newQuantity = initialQuantity + 3;
  const updateBody = {
    quantity: newQuantity,
  } satisfies IEcommerceMallCartItem.IUpdate;
  const updatedCartItem =
    await api.functional.ecommerceMall.customer.cart_items.update(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCartItem);
  // Step 9: Validate response
  TestValidator.equals(
    "quantity updated",
    updatedCartItem.quantity,
    newQuantity,
  );
  TestValidator.equals(
    "product variant unchanged",
    updatedCartItem.productVariant.id,
    variant.id,
  );
  // Calculate expected subtotal based on variant price (fallback to 0 if null) and new quantity
  const variantPrice = variant.price ?? 0;
  const expectedSubtotal = variantPrice * newQuantity;
  TestValidator.equals(
    "subtotal recalculated",
    updatedCartItem.subtotal,
    expectedSubtotal,
  );
  // Verify updatedAt timestamp is newer (refreshed)
  TestValidator.predicate(
    "updatedAt is refreshed",
    () => new Date(updatedCartItem.updatedAt) > new Date(originalUpdatedAt),
  );
  // Verify stockAvailability enum is valid
  const validStockValues = ["in_stock", "low_stock", "out_of_stock"] as const;
  TestValidator.predicate("stockAvailability is valid enum", () =>
    (validStockValues as readonly string[]).includes(
      updatedCartItem.stockAvailability,
    ),
  );
  TestValidator.equals(
    "cart item ID unchanged",
    updatedCartItem.id,
    cartItem.id,
  );
  TestValidator.predicate(
    "deletedAt is null",
    () => updatedCartItem.deletedAt === null,
  );
}
