import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_thumbnail_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies Partial<IShoppingMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 3. Upload first image (should become main thumbnail)
  const firstImageUrl = "https://cdn.example.com/product-main.jpg";
  const firstImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: firstImageUrl,
          display_order: 0,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  // 4. Upload second image (should NOT become main thumbnail)
  const secondImageUrl = "https://cdn.example.com/product-secondary.jpg";
  const secondImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: secondImageUrl,
          display_order: 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  // 5. Verify first image has lowest display_order (main thumbnail)
  TestValidator.equals(
    "first image display_order should be 0",
    firstImage.display_order,
    0,
  );
  // 6. Verify second image has higher display_order
  TestValidator.equals(
    "second image display_order should be 1",
    secondImage.display_order,
    1,
  );
  // 7. Verify display_order ordering ensures first image is thumbnail
  TestValidator.predicate(
    "first image has lower display_order than second",
    firstImage.display_order < secondImage.display_order,
  );
  // 8. Verify both images are associated with correct product
  TestValidator.equals(
    "first image product ID matches",
    firstImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "second image product ID matches",
    secondImage.product.id,
    product.id,
  );
  // 9. Verify image URLs are preserved correctly
  TestValidator.equals(
    "first image URL matches uploaded URL",
    firstImage.image_url,
    firstImageUrl,
  );
  TestValidator.equals(
    "second image URL matches uploaded URL",
    secondImage.image_url,
    secondImageUrl,
  );
}
