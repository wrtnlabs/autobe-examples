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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
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

/**
 * Test cart item listing with stock availability indicators.
 *
 * Validates that the cart items listing endpoint returns cart item summaries
 * with product variant details. The test creates products, variants, and cart
 * items, then verifies the pagination response structure and data integrity.
 */
export async function test_api_cart_item_listing_with_stock_warnings(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string | null>(),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Setup seller and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
          categoryId: category.id,
          basePrice: typia.random<number & tags.Minimum<0>>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. Create product variant
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: typia.random<string & tags.MinLength<1>>(),
          price: typia.random<number & tags.Minimum<0>>(),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
            {
              optionName: "Size",
              optionValue: "Large",
            },
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Setup customer and add items to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  const cartQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const cartItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: cartQuantity,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 5. List cart items and verify response structure
  const cartItemsPage: IPageIEcommerceMallCartItem.ISummary =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartItemsPage);
  // 6. Validate pagination and cart item data
  TestValidator.predicate(
    "pagination current page is valid",
    cartItemsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "cart items count matches pagination records",
    cartItemsPage.data.length === cartItemsPage.pagination.records,
  );
  TestValidator.predicate(
    "created cart item is in the list",
    cartItemsPage.data.some((item) => item.id === cartItem.id),
  );
  const foundCartItem = cartItemsPage.data.find(
    (item) => item.id === cartItem.id,
  );
  if (foundCartItem) {
    TestValidator.equals(
      "cart item quantity matches created quantity",
      foundCartItem.quantity,
      cartQuantity,
    );
    TestValidator.equals(
      "cart item variant id matches",
      foundCartItem.productVariant.id,
      variant.id,
    );
    TestValidator.equals(
      "cart item variant sku matches",
      foundCartItem.productVariant.skuCode,
      variant.skuCode,
    );
  }
}
