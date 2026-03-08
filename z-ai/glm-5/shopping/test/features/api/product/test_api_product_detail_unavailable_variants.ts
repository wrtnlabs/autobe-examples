import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_detail_unavailable_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create category for product assignment
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Create seller for product ownership
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 4. Create product with basic information
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Add product image
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: "https://example.com/product-image.jpg",
          display_order: 0,
        },
      },
    );
  typia.assert(image);
  // 6. Create variant with zero stock (default behavior - no inventory records)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: { color: "Black", size: "M" },
        },
      },
    );
  typia.assert(variant);
  // 7. Fetch product detail (no auth required for viewing)
  const productDetail = await api.functional.shoppingMall.products.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(productDetail);
  // 8. Verify product is returned successfully (not 404)
  TestValidator.equals("product id matches", productDetail.id, product.id);
  TestValidator.equals(
    "product name matches",
    productDetail.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    productDetail.description,
    product.description,
  );
  TestValidator.equals(
    "product base price matches",
    productDetail.base_price,
    product.base_price,
  );
  // 9. Verify seller info is accessible
  TestValidator.equals(
    "seller id matches",
    productDetail.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller shop name matches",
    productDetail.seller.shop_name,
    sellerAuth.shopName,
  );
  // 10. Verify category info is accessible
  TestValidator.equals(
    "category id matches",
    productDetail.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    productDetail.category.name,
    category.name,
  );
  // 11. Verify images are accessible
  TestValidator.predicate(
    "images array not empty",
    productDetail.images.length > 0,
  );
  // 12. Verify variants array contains the created variant
  TestValidator.predicate(
    "variants array not empty",
    productDetail.variants.length > 0,
  );
  // 13. Verify all variants have zero stock (out of stock)
  const allVariantsOutOfStock = productDetail.variants.every(
    (v) => v.stock_quantity === 0,
  );
  TestValidator.predicate(
    "all variants have zero stock",
    allVariantsOutOfStock,
  );
  // 14. Verify the specific variant's stock is zero
  const createdVariant = productDetail.variants.find(
    (v) => v.id === variant.id,
  );
  TestValidator.predicate(
    "created variant found in response",
    createdVariant !== undefined,
  );
  TestValidator.equals(
    "variant stock quantity is zero",
    createdVariant!.stock_quantity,
    0,
  );
}
