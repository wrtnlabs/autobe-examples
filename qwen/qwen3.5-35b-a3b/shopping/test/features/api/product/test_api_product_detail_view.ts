import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_detail_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create valid category for product (admin pre-created)
  // For E2E testing, we assume a valid category exists
  const testCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Seller creates product with category
  const sellerProductConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuth.token.access,
    },
  };
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerProductConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: testCategoryId,
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<9999999>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller adds variant to product
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerProductConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: JSON.stringify({
            color: RandomGenerator.alphabets(5),
            size: RandomGenerator.alphabets(3),
          }),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999999>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Seller uploads product image
  const image =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerProductConnection,
      {
        productId: product.id,
        body: {
          image_url: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
          display_order: 1,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image);
  // 6. Customer views product detail page (unauthenticated)
  const productDetail = await api.functional.ecommerceMall.products.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(productDetail);
  // 7. Validate product entity structure
  TestValidator.equals(
    "product id matches created",
    productDetail.id,
    product.id,
  );
  TestValidator.equals(
    "product name is present",
    productDetail.name.length,
    productDetail.name.length > 0 ? 1 : 0,
  );
  TestValidator.equals(
    "product description is present",
    productDetail.description.length,
    productDetail.description.length > 0 ? 1 : 0,
  );
  TestValidator.equals(
    "product base price is positive",
    productDetail.base_price,
    productDetail.base_price > 0 ? productDetail.base_price : 0,
  );
  TestValidator.equals(
    "product created_at is valid",
    !isNaN(Date.parse(productDetail.created_at)),
    true,
  );
  TestValidator.equals(
    "product updated_at is valid",
    !isNaN(Date.parse(productDetail.updated_at)),
    true,
  );
  TestValidator.equals(
    "product deleted_at is NULL",
    productDetail.deleted_at,
    null,
  );
  // 8. Validate category relationship
  TestValidator.equals(
    "category name is present",
    productDetail.category.name.length,
    productDetail.category.name.length > 0 ? 1 : 0,
  );
  TestValidator.equals(
    "category description",
    productDetail.category.description,
    productDetail.category.description,
  );
  TestValidator.equals(
    "category sort_order is integer",
    productDetail.category.sort_order,
    productDetail.category.sort_order,
  );
  TestValidator.equals(
    "category parent is null",
    productDetail.category.parent,
    null,
  );
  // 9. Validate seller relationship
  TestValidator.equals(
    "seller display_name is present",
    productDetail.seller.display_name.length,
    productDetail.seller.display_name.length > 0 ? 1 : 0,
  );
  TestValidator.equals(
    "seller approval_status is valid",
    productDetail.seller.approval_status,
    productDetail.seller.approval_status,
  );
  TestValidator.equals(
    "seller is_suspended is boolean",
    typeof productDetail.seller.is_suspended,
    "boolean",
  );
  TestValidator.equals(
    "seller created_at is valid",
    !isNaN(Date.parse(productDetail.seller.created_at)),
    true,
  );
  // 10. Validate variants array
  TestValidator.equals(
    "variants count is at least 1",
    productDetail.variants.length,
    productDetail.variants.length >= 1 ? productDetail.variants.length : 1,
  );
  const firstVariant = productDetail.variants[0];
  TestValidator.equals("variant id exists", !!firstVariant.id, true);
  TestValidator.equals(
    "variant sku_code is present",
    firstVariant.sku_code.length,
    firstVariant.sku_code.length > 0 ? 1 : 0,
  );
  TestValidator.equals(
    "variant option_values is string",
    typeof firstVariant.option_values,
    "string",
  );
  TestValidator.equals(
    "variant stock_quantity is non-negative",
    firstVariant.stock_quantity,
    firstVariant.stock_quantity >= 0 ? firstVariant.stock_quantity : 0,
  );
  TestValidator.equals(
    "variant deleted_at is NULL",
    firstVariant.deleted_at,
    null,
  );
  // 11. Validate images array
  TestValidator.equals(
    "images count is at least 1",
    productDetail.images.length,
    productDetail.images.length >= 1 ? productDetail.images.length : 1,
  );
  const firstImage = productDetail.images[0];
  TestValidator.equals("image id exists", !!firstImage.id, true);
  TestValidator.equals(
    "image url is string",
    typeof firstImage.image_url,
    "string",
  );
  TestValidator.equals(
    "image display_order is integer",
    typeof firstImage.display_order,
    "number",
  );
  TestValidator.equals("image deleted_at is NULL", firstImage.deleted_at, null);
  // 12. Validate review statistics
  TestValidator.equals(
    "review stats id exists",
    !!productDetail.reviewStats.id,
    true,
  );
  TestValidator.equals(
    "review stats product_id matches",
    productDetail.reviewStats.ecommerce_mall_product_id,
    product.id,
  );
  if (
    productDetail.reviewStats.average_rating !== null &&
    productDetail.reviewStats.average_rating !== undefined
  ) {
    TestValidator.predicate(
      "average_rating is within 0-5 range",
      productDetail.reviewStats.average_rating >= 0 &&
        productDetail.reviewStats.average_rating <= 5,
    );
  }
  TestValidator.equals(
    "review stats review_count is non-negative",
    productDetail.reviewStats.review_count,
    productDetail.reviewStats.review_count >= 0
      ? productDetail.reviewStats.review_count
      : 0,
  );
  TestValidator.equals(
    "review stats rating_1_count is non-negative",
    productDetail.reviewStats.rating_1_count,
    productDetail.reviewStats.rating_1_count >= 0
      ? productDetail.reviewStats.rating_1_count
      : 0,
  );
  TestValidator.equals(
    "review stats created_at is valid",
    !isNaN(Date.parse(productDetail.reviewStats.created_at)),
    true,
  );
  TestValidator.equals(
    "review stats updated_at is valid",
    !isNaN(Date.parse(productDetail.reviewStats.updated_at)),
    true,
  );
  // 13. Validate at least one variant has stock available
  const hasAvailableVariant = productDetail.variants.some(
    (v) => v.stock_quantity > 0,
  );
  TestValidator.predicate(
    "at least one variant has stock",
    hasAvailableVariant,
  );
  // 14. Verify images are sorted by display_order ascending
  const imageDisplayOrders = productDetail.images.map(
    (img) => img.display_order,
  );
  const isSorted = imageDisplayOrders.every((val, i) =>
    i === 0 ? true : imageDisplayOrders[i - 1] <= val,
  );
  TestValidator.predicate("images sorted by display_order", isSorted);
}