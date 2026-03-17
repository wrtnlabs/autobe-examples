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
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_convert_to_cart_quantity_combine(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Setup seller and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: 100,
        } satisfies Partial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // Setup customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add product to wishlist
  const wishlistItem =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        } satisfies Partial<IEcommerceMallWishlistItem.ICreate>,
      },
    );
  typia.assert(wishlistItem);
  // Pre-add variant to cart with quantity 2
  const initialCartItem =
    await generate_random_ecommerce_mall_customer_cart_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        } satisfies Partial<IEcommerceMallCartItem.ICreate>,
      },
    );
  typia.assert(initialCartItem);
  const initialCartItemId = initialCartItem.id;
  const initialUpdatedAt = initialCartItem.updatedAt;
  // Convert wishlist item to cart with quantity 3 - should combine to 5
  const convertedCartItem =
    await api.functional.ecommerceMall.customer.wishlist.convert_to_cart.convertToCart(
      customerConnection,
      {
        body: {
          wishlistItemId: wishlistItem.id,
          variantId: variant.id,
          quantity: 3,
        } satisfies IEcommerceMallWishlistItem.IConvertToCart,
      },
    );
  typia.assert(convertedCartItem);
  // Verify combined quantity (2 + 3 = 5)
  TestValidator.equals("combined quantity is 5", convertedCartItem.quantity, 5);
  // Verify cart item ID preserved (same record updated, not new created)
  TestValidator.equals(
    "cart item ID unchanged",
    convertedCartItem.id,
    initialCartItemId,
  );
  // Verify updatedAt timestamp reflects update
  TestValidator.notEquals(
    "updatedAt changed after conversion",
    convertedCartItem.updatedAt,
    initialUpdatedAt,
  );
  // Verify subtotal recalculated with combined quantity
  const expectedSubtotal = convertedCartItem.unitPrice * 5;
  TestValidator.equals(
    "subtotal recalculated",
    convertedCartItem.subtotal,
    expectedSubtotal,
  );
}
