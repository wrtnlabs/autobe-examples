import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test cart item retrieval after the referenced product variant is soft-deleted by the seller.
 *
 * Validates the "unavailable items" business rule: when a seller deletes a variant that a customer already has in their cart, the cart item persists with all original data intact — it is never removed from the cart. However, the computed `available` flag must be `false`, indicating the variant is no longer purchasable. The variant reference must be preserved in the response so the customer can identify which item is affected.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, gets approved by the administrator.
 * 3. Seller creates a product and a purchasable variant with stock.
 * 4. Customer registers and adds the variant to their cart.
 * 5. Verifies the cart item is initially available.
 * 6. Seller soft-deletes the variant.
 * 7. Customer retrieves the cart item by its ID.
 * 8. Validates the cart item persists with `available: false` and the variant reference preserved.
 */
export async function test_api_cart_item_retrieve_variant_deleted_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 3. Seller creates product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Seller adds stock to the variant
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      body: {
        quantity_change: 10,
        reason: "Initial stock for testing",
      },
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 6. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  TestValidator.predicate(
    "cart item is initially available",
    cartItem.available,
  );
  // 8. Seller soft-deletes the variant
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 9. Customer retrieves the cart item after variant deletion
  const retrievedCartItem =
    await api.functional.shoppingMall.customer.cart_items.at(
      customerConnection,
      {
        cartItemId: cartItem.id,
      },
    );
  typia.assert(retrievedCartItem);
  // 10. Validate: cart item persists with unavailable flag and preserved variant reference
  TestValidator.equals(
    "cart item id unchanged",
    retrievedCartItem.id,
    cartItem.id,
  );
  TestValidator.equals(
    "cart item quantity preserved",
    retrievedCartItem.quantity,
    cartItem.quantity,
  );
  TestValidator.predicate(
    "available flag is false after variant deletion",
    !retrievedCartItem.available,
  );
  TestValidator.equals(
    "variant reference id preserved",
    retrievedCartItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant code preserved",
    retrievedCartItem.productVariant.code,
    variant.code,
  );
}
