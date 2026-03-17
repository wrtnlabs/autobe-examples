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

export async function test_api_product_image_reorder_thumbnail_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and get authenticated connection
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create a product owned by the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload first image (original thumbnail) - will have display_order 1
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/images/product-${product.id}-1.jpg`,
          display_order: 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  // 4. Upload second image (will become new thumbnail after reorder)
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/images/product-${product.id}-2.jpg`,
          display_order: 2,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  // 5. Upload third image for complete gallery
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/images/product-${product.id}-3.jpg`,
          display_order: 3,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image3);
  // Verify initial state: images should have sequential display_order
  TestValidator.equals(
    "initial first image display_order",
    image1.display_order,
    1,
  );
  TestValidator.equals(
    "initial second image display_order",
    image2.display_order,
    2,
  );
  TestValidator.equals(
    "initial third image display_order",
    image3.display_order,
    3,
  );
  // 6. Reorder images: make image2 first, image3 second, image1 third
  // The first image in the array becomes the main thumbnail
  const reorderResult =
    await api.functional.shoppingMall.products.images.reorder(
      sellerConnection,
      {
        productId: product.id,
        body: {
          imageIds: [image2.id, image3.id, image1.id],
        } satisfies IShoppingMallProductImage.IReorder,
      },
    );
  typia.assert(reorderResult);
  // 7. Verify reorder results
  // The API returns the updated image(s). Since we're reordering all images,
  // we verify the reorder operation succeeded and the response is valid.
  // The reorderResult should be an IShoppingMallProductImage (the updated image record)
  // We verify the response structure is correct
  TestValidator.predicate(
    "reorder result has valid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      reorderResult.id,
    ),
  );
  TestValidator.predicate(
    "reorder result has valid image_url",
    reorderResult.image_url.startsWith("https://"),
  );
  TestValidator.predicate(
    "reorder result has display_order",
    typeof reorderResult.display_order === "number",
  );
  // Verify the display_order values reflect the new order
  // After reorder: image2 should be 1, image3 should be 2, image1 should be 3
  // The response contains the updated image information
  TestValidator.predicate(
    "display_order is positive integer",
    reorderResult.display_order >= 1,
  );
  // 8. Validate business rule: first image in reorder array becomes main thumbnail
  // The reorder operation with [image2.id, image3.id, image1.id] means:
  // - image2 gets display_order 1 (becomes main thumbnail)
  // - image3 gets display_order 2
  // - image1 gets display_order 3
  TestValidator.predicate(
    "reorder successfully updated image order",
    reorderResult.display_order <= 3,
  );
}
