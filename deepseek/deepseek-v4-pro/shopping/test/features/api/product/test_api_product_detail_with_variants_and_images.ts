import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test customer product detail retrieval with variants and gallery images.
 *
 * Validates the complete product detail page aggregation returned to an
 * authenticated customer. The response combines product core identity
 * (name, description, base price), category classification, seller storefront
 * profile, ordered image gallery, purchasable variants with stock status, and
 * computed review statistics.
 *
 * Special attention is given to verifying that gallery images are returned in
 * display_order ascending sequence, that at least one variant has positive
 * stock (making is_available true), and that computed fields (average_rating,
 * review_count) correctly reflect the absence of reviews.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, administrator approves the pending seller.
 * 3. Approved seller creates a product assigned to the category, uploads
 *    multiple gallery images, and creates a variant with positive stock.
 * 4. Customer registers and retrieves the product detail.
 * 5. Validates product core fields, category summary, seller profile,
 *    image gallery ordering, variant attributes and stock, and computed
 *    fields (null average_rating, zero review_count, true is_available).
 */
export async function test_api_product_detail_with_variants_and_images(
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
  // 2. Seller registration and admin approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // 3. Seller creates a product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Seller uploads multiple gallery images
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  // 5. Seller creates a variant with positive initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 6. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Customer retrieves product detail
  const detail = await api.functional.shoppingMall.customer.products.detail.at(
    customerConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(detail);
  // 8. Validate product core fields
  TestValidator.equals("product id", detail.id, product.id);
  TestValidator.equals("product name", detail.name, product.name);
  TestValidator.equals(
    "product description",
    detail.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price",
    detail.base_price,
    product.base_price,
  );
  // 9. Validate category summary
  TestValidator.equals("category id", detail.category.id, category.id);
  TestValidator.equals("category name", detail.category.name, category.name);
  // 10. Validate seller profile
  TestValidator.equals(
    "seller shop_name",
    detail.seller.shop_name,
    sellerAuth.profile.shop_name,
  );
  TestValidator.equals(
    "seller logo_image_uri",
    detail.seller.logo_image_uri,
    sellerAuth.profile.logo_image_uri,
  );
  // 11. Validate images array — ordered by display_order ascending
  TestValidator.predicate("has at least 3 images", detail.images.length >= 3);
  for (let i = 1; i < detail.images.length; i++) {
    TestValidator.predicate(
      "images ordered by display_order ascending",
      detail.images[i - 1].display_order < detail.images[i].display_order,
    );
  }
  // 12. Validate variants
  TestValidator.predicate(
    "has at least 1 variant",
    detail.variants.length >= 1,
  );
  const firstVariant = detail.variants[0];
  TestValidator.predicate(
    "variant has non-empty SKU code",
    firstVariant.code.length > 0,
  );
  TestValidator.predicate(
    "variant has option values",
    firstVariant.optionValues.length > 0,
  );
  TestValidator.equals(
    "variant base_price matches product base_price",
    firstVariant.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "variant has positive stock quantity",
    firstVariant.stock_quantity > 0,
  );
  // 13. Validate computed fields
  TestValidator.equals(
    "average_rating is null when no reviews exist",
    detail.average_rating,
    null,
  );
  TestValidator.equals(
    "review_count is 0 when no reviews exist",
    detail.review_count,
    0,
  );
  TestValidator.equals(
    "is_available is true when variant has positive stock",
    detail.is_available,
    true,
  );
  TestValidator.equals(
    "deleted_at is null for active product",
    detail.deleted_at,
    null,
  );
}
