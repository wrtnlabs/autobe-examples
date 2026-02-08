import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
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

export async function test_api_product_image_display_order_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Seller creates a new product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // Extract productId from product, forcibly cast since DTO lacks 'id' property
  const productId = (product as any).id;
  // 3. Seller uploads multiple product images
  const imageCount = 3;
  const images: IShoppingMallProductImage[] = [];
  for (let i = 0; i < imageCount; ++i) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId },
          body: {
            image_url: `https://example.com/${RandomGenerator.alphabets(8)}.jpg`,
            display_order: i + 1,
          },
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // Prepare reorder payload with id and reversed display_order
  const reorderedPayload = images.map((img, idx) => ({
    id: (img as any).id,
    display_order: imageCount - idx,
  }));
  // 4. Call updateImages API
  const updatedImages =
    await api.functional.shoppingMall.seller.products.images.updateImages(
      sellerConnection,
      { productId, body: reorderedPayload },
    );
  typia.assert(updatedImages);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    updatedImages.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit",
    updatedImages.pagination.limit >= imageCount,
  );
  TestValidator.predicate(
    "pagination records",
    updatedImages.pagination.records >= imageCount,
  );
  TestValidator.predicate(
    "pagination pages",
    updatedImages.pagination.pages >= 1,
  );
  // 6. Validate updated images count
  TestValidator.equals(
    "updated images count",
    updatedImages.data.length,
    imageCount,
  );
  // 7. Validate unique display_order in updated images
  const displayOrders = new Set<number>();
  for (const image of updatedImages.data) {
    // DTO lacks display_order property on ISummary, cast to any to access
    const order = (image as any).display_order;
    if (typeof order === "number") {
      TestValidator.predicate(
        "unique display order",
        !displayOrders.has(order),
      );
      displayOrders.add(order);
    }
  }
}
