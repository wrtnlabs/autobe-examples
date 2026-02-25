import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_images_create_image } from "../../../generate/generate_random_shopping_mall_seller_products_images_create_image";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_seller_product_multiple_images_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(seller);
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // 2. Prepare a product id linked to the seller
  // Note: The scenario does not give product create API. We will fake product ID for test purpose.
  // In real test, product creation would be required by another test or fixture.
  // We use a random UUID to simulate productId.
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create multiple images with different display_order
  const imageCount = 3;
  // Assign display_order such that the lowest is thumbnail (0)
  const displayOrders = [2, 0, 1];
  // Random image URLs (simulate)
  const imageUrls = ArrayUtil.repeat(
    imageCount,
    (_) => `https://image.example.com/${RandomGenerator.alphabets(10)}.jpg`,
  );
  // 4. Create images concurrently
  const createdImages = await Promise.all(
    displayOrders.map((order, idx) =>
      generate_random_shopping_mall_seller_products_images_create_image(
        sellerConnection,
        {
          params: { productId },
          body: {
            image_url: imageUrls[idx],
            display_order: order,
          },
        },
      ),
    ),
  );
  // 5. Validate all created images
  createdImages.forEach((img) => typia.assert(img));
  // 6. Validate ordering and thumbnail definition (lowest display_order)
  const sortedByDisplayOrder = [...createdImages].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  // Thumbnail is image with displayOrder 0
  TestValidator.equals(
    "thumbnail display order",
    sortedByDisplayOrder[0].displayOrder,
    0,
  );
  // The first image in original createdImages array matching displayOrder 0
  const thumbnailImage = createdImages.find((img) => img.displayOrder === 0);
  TestValidator.predicate(
    "thumbnail image exists",
    thumbnailImage !== undefined,
  );
  // Validate thumbnail image url matches the one with displayOrder 0
  if (thumbnailImage !== undefined) {
    // Check its url is as injected
    TestValidator.equals(
      "thumbnail image url",
      thumbnailImage.imageUrl,
      imageUrls[displayOrders.indexOf(0)],
    );
  }
  // Validate all images belong to same productId
  createdImages.forEach((img) => {
    TestValidator.equals(
      "image product id",
      img.shoppingMallProductId,
      productId,
    );
  });
}
