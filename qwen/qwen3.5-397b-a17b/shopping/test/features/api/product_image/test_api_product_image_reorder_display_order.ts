import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function test_api_product_image_reorder_display_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload 3 images to the product
  const imageUrls = ArrayUtil.repeat(3, (index) => ({
    image_url: `https://example.com/product-${product.id}-image-${index}.jpg`,
  }));
  const images: IShoppingMallProductImage[] = [];
  for (const imageUrl of imageUrls) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: imageUrl satisfies IShoppingMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // Verify initial display_order values (should be 0, 1, 2)
  TestValidator.equals("initial image count", images.length, 3);
  TestValidator.equals("first image display_order", images[0].display_order, 0);
  TestValidator.equals(
    "second image display_order",
    images[1].display_order,
    1,
  );
  TestValidator.equals("third image display_order", images[2].display_order, 2);
  // 4. Update the display_order of the third image to position 0 (make it the thumbnail)
  const originalThirdImage = images[2];
  const originalUpdatedAt = originalThirdImage.updated_at;
  const updatedImage =
    await api.functional.shoppingMall.seller.products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: originalThirdImage.id,
        body: {
          display_order: 0,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 5. Verify the updated image has the new display_order
  TestValidator.equals("updated display_order", updatedImage.display_order, 0);
  // 6. Verify updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at changed",
    updatedImage.updated_at,
    originalUpdatedAt,
  );
  // 7. Verify the image that was previously at position 0 is now at a different position
  // (system should have adjusted to maintain unique display_order values)
  TestValidator.notEquals(
    "original first image moved",
    images[0].display_order,
    updatedImage.display_order,
  );
  // 8. Update another image to test reordering again
  const secondImage = images[1];
  const updatedSecondImage =
    await api.functional.shoppingMall.seller.products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: secondImage.id,
        body: {
          display_order: 1,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedSecondImage);
  TestValidator.equals(
    "second image display_order",
    updatedSecondImage.display_order,
    1,
  );
  // 9. Verify all display_order values are unique
  const allDisplayOrders = [
    updatedImage.display_order,
    updatedSecondImage.display_order,
  ];
  const uniqueDisplayOrders = new Set(allDisplayOrders);
  TestValidator.equals(
    "display_order uniqueness",
    uniqueDisplayOrders.size,
    allDisplayOrders.length,
  );
}