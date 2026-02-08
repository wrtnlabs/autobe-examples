import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_update_display_order_thumbnail_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller join and create a sellerConnection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create product using utility
  const productRaw = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const product = typia.assert<IShoppingMallProduct & { id: string }>(productRaw);
  // 3. Upload multiple images to the product
  const images: (IShoppingMallProductImage & { id: string; updated_at: string; imageUrl: string; displayOrder: number })[] = [];
  for (let i = 0; i < 3; i++) {
    const imageRaw =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
        },
      );
    const image = typia.assert<IShoppingMallProductImage & { id: string; updated_at: string; imageUrl: string; displayOrder: number }>(imageRaw);
    images.push(image);
  }
  // 4. Identify the image to update - choose the last image
  const imageToUpdate = images[images.length - 1];
  // Collect original updated_at timestamps for comparison
  const originalUpdatedAts = images.map((image) => image.updated_at);
  // Set new displayOrder to 0 to make it the thumbnail
  const newDisplayOrder = 0;
  // 5. Update the chosen image's displayOrder to newDisplayOrder
  const updatedImageRaw =
    await api.functional.shoppingMall.seller.products.images.updateImage(
      sellerConnection,
      {
        productId: product.id,
        imageId: imageToUpdate.id,
        body: {
          imageUrl: imageToUpdate.imageUrl,
          displayOrder: newDisplayOrder,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  const updatedImage = typia.assert<IShoppingMallProductImage & { id: string; updated_at: string; displayOrder: number }>(updatedImageRaw);
  // 6. Validate that the updated image's displayOrder is newDisplayOrder
  TestValidator.equals(
    "updated image displayOrder",
    updatedImage.displayOrder,
    newDisplayOrder,
  );
  // 7. Validate that updated_at timestamp is changed
  TestValidator.predicate(
    "updated_at timestamp updated",
    new Date(updatedImage.updated_at).getTime() >
      new Date(imageToUpdate.updated_at).getTime(),
  );
  // 8. Use original images array and update the updated image
  const imagesUpdated = images.map((img) =>
    img.id === updatedImage.id ? updatedImage : img,
  );
  // Check the displayOrders are unique and consistent
  const displayOrders = imagesUpdated.map((img) => img.displayOrder);
  const uniqueDisplayOrders = new Set(displayOrders);
  TestValidator.equals(
    "unique display orders",
    uniqueDisplayOrders.size,
    imagesUpdated.length,
  );
  // Check the displayOrders are sorted ascending order
  const sortedDisplayOrders = [...displayOrders].sort((a, b) => a - b);
  TestValidator.equals(
    "display orders sorted ascending",
    displayOrders,
    sortedDisplayOrders,
  );
}
