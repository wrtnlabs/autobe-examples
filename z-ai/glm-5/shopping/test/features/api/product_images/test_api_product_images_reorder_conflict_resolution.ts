import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_images_reorder_conflict_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Upload 3 images with sequential display orders
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { displayOrder: 0 },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { displayOrder: 1 },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { displayOrder: 2 },
      },
    );
  typia.assert(image3);
  // 4. Test conflict resolution by updating all images to display_order: 0
  // The system should auto-resolve conflicts and reassign sequential orders
  const updatedImage1 =
    await api.functional.shoppingMall.products.images.update(sellerConnection, {
      productId: product.id,
      body: {
        id: image1.id,
        display_order: 0,
      } satisfies IShoppingMallProductImage.IUpdate,
    });
  typia.assert(updatedImage1);
  const updatedImage2 =
    await api.functional.shoppingMall.products.images.update(sellerConnection, {
      productId: product.id,
      body: {
        id: image2.id,
        display_order: 0,
      } satisfies IShoppingMallProductImage.IUpdate,
    });
  typia.assert(updatedImage2);
  const updatedImage3 =
    await api.functional.shoppingMall.products.images.update(sellerConnection, {
      productId: product.id,
      body: {
        id: image3.id,
        display_order: 0,
      } satisfies IShoppingMallProductImage.IUpdate,
    });
  typia.assert(updatedImage3);
  // 5. Validate conflict resolution - collect final display orders
  const displayOrders = [
    updatedImage1.displayOrder,
    updatedImage2.displayOrder,
    updatedImage3.displayOrder,
  ];
  // Verify all display orders are unique (conflict resolution worked)
  const uniqueOrders = new Set(displayOrders);
  TestValidator.equals("all display orders are unique", uniqueOrders.size, 3);
  // Verify sequential orders with no gaps (0, 1, 2)
  const sortedOrders = [...displayOrders].sort((a, b) => a - b);
  TestValidator.equals(
    "display orders are sequential from 0",
    sortedOrders[0],
    0,
  );
  TestValidator.equals(
    "display orders are sequential from 0",
    sortedOrders[1],
    1,
  );
  TestValidator.equals(
    "display orders are sequential from 0",
    sortedOrders[2],
    2,
  );
  // Verify no gaps in sequence (consecutive integers)
  TestValidator.predicate(
    "no gaps in display order sequence",
    sortedOrders[0] === 0 && sortedOrders[1] === 1 && sortedOrders[2] === 2,
  );
  // 6. Verify all image IDs are preserved (no images lost)
  const imageIds = new Set([
    updatedImage1.id,
    updatedImage2.id,
    updatedImage3.id,
  ]);
  TestValidator.equals("no images lost during reorder", imageIds.size, 3);
  TestValidator.predicate(
    "original image IDs preserved",
    imageIds.has(image1.id) &&
      imageIds.has(image2.id) &&
      imageIds.has(image3.id),
  );
}
