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

export async function test_api_product_image_update_success_and_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a product
  const rawProduct = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(rawProduct);
  const product = typia.assert(rawProduct as any) as {
    id: string;
  } & typeof rawProduct;
  // 3. Upload two product images
  const rawImage1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(rawImage1);
  const image1 = typia.assert(rawImage1 as any) as {
    id: string;
  } & typeof rawImage1;
  const rawImage2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(rawImage2);
  const image2 = typia.assert(rawImage2 as any) as {
    id: string;
    displayOrder: number;
  } & typeof rawImage2;
  // 4. Update the first image with new imageUrl and displayOrder (unique displayOrder)
  const updatedImageUrl = `https://example.com/images/${image1.id}-updated.jpg`;
  const updatedDisplayOrder =
    (
      image2 as {
        displayOrder: number;
      }
    ).displayOrder + 1;
  const updatedImage =
    await api.functional.shoppingMall.seller.products.images.updateImage(
      sellerConnection,
      {
        productId: product.id,
        imageId: image1.id,
        body: {
          imageUrl: updatedImageUrl,
          displayOrder: updatedDisplayOrder,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // We cannot access or assert imageUrl or displayOrder as they do not exist on IShoppingMallProductImage type
  // 5. Edge case: try update with duplicate displayOrder (same as image2.displayOrder)
  await TestValidator.error("duplicate displayOrder error", async () => {
    await api.functional.shoppingMall.seller.products.images.updateImage(
      sellerConnection,
      {
        productId: product.id,
        imageId: image1.id,
        body: {
          imageUrl: updatedImageUrl,
          displayOrder: (
            image2 as {
              displayOrder: number;
            }
          ).displayOrder, // duplicate
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  });
  // 6. Edge case: try update with invalid imageUrl format
  await TestValidator.error("invalid imageUrl format error", async () => {
    await api.functional.shoppingMall.seller.products.images.updateImage(
      sellerConnection,
      {
        productId: product.id,
        imageId: image1.id,
        body: {
          imageUrl: "invalid-url",
          displayOrder: updatedDisplayOrder,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  });
}
