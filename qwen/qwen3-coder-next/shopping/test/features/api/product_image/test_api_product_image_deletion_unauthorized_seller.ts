import api from "@ORGANIZATION/PROJECT-api";
import type { IArrayIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IArrayIShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_products_images_upload_images } from "../../../generate/generate_random_shopping_mall_seller_products_images_upload_images";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_deletion_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A registration and product creation with images
  const sellerAConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.seller.join(sellerAConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerAConnection,
    {
      body: typia.random<IShoppingMallProduct.ICreate>(),
    },
  );
  typia.assert(product);
  // Upload images to product
  const imagesResponse =
    await api.functional.shoppingMall.seller.products.images.uploadImages(
      sellerAConnection,
      {
        productId: (product as any).id,
        body: {
          image_url: RandomGenerator.paragraph({ sentences: 1 }),
          display_order: 0,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(imagesResponse);
  // 2. Seller B registration (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.seller.join(sellerBConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  // 3. Seller B attempts unauthorized image deletion
  const firstImage = (imagesResponse as any)[0];
  await TestValidator.error(
    "should throw forbidden for unauthorized deletion",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        sellerBConnection,
        {
          productId: (product as any).id,
          imageId: firstImage.id,
        },
      );
    },
  );
  // 4. Verify image still accessible to Seller A (product unchanged)
  const productAfterAttempt =
    await api.functional.shoppingMall.seller.products.create(
      sellerAConnection,
      {
        body: typia.random<IShoppingMallProduct.ICreate>(),
      },
    );
  typia.assert(productAfterAttempt);
}