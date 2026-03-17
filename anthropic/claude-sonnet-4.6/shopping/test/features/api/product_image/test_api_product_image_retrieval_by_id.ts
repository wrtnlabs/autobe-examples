import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_image_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category (admin connection required)
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create a product with the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Upload first image to the product
  const firstImageUrl = typia.random<string & tags.Format<"url">>();
  const bundle1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          urls: [firstImageUrl],
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(bundle1);
  // Extract the first image info (lowest sequence)
  const firstImage = bundle1.images[0];
  typia.assertGuard(firstImage!);
  // 6. Retrieve the first image via public endpoint (no auth needed)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedFirst = await api.functional.shoppingMall.products.images.at(
    publicConnection,
    {
      productId: product.id,
      imageId: firstImage.id,
    },
  );
  typia.assert(retrievedFirst);
  // Validate first image data
  TestValidator.equals(
    "first image id matches",
    retrievedFirst.id,
    firstImage.id,
  );
  TestValidator.equals(
    "first image product id matches",
    retrievedFirst.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "first image url matches",
    retrievedFirst.url,
    firstImageUrl,
  );
  // 7. Edge case: upload a second image
  const secondImageUrl = typia.random<string & tags.Format<"url">>();
  const bundle2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          urls: [secondImageUrl],
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(bundle2);
  // Find the second image (the newly added one, highest sequence)
  const secondImage = bundle2.images[bundle2.images.length - 1];
  typia.assertGuard(secondImage!);
  // Retrieve the second image via public endpoint
  const retrievedSecond = await api.functional.shoppingMall.products.images.at(
    publicConnection,
    {
      productId: product.id,
      imageId: secondImage.id,
    },
  );
  typia.assert(retrievedSecond);
  // Validate second image data
  TestValidator.equals(
    "second image id matches",
    retrievedSecond.id,
    secondImage.id,
  );
  TestValidator.equals(
    "second image url matches",
    retrievedSecond.url,
    secondImageUrl,
  );
  // Validate sequence ordering: second image sequence > first image sequence
  TestValidator.predicate(
    "second image has higher sequence than first image",
    retrievedSecond.sequence > retrievedFirst.sequence,
  );
}
