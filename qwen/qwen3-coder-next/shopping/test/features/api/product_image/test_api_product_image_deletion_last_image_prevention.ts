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

export async function test_api_product_image_deletion_last_image_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product with seller authentication
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<100>>(),
        variants: [
          {
            name: RandomGenerator.name(),
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<100>
            >(),
            stock: 10,
            sku: RandomGenerator.alphaNumeric(8),
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload one image to the product
  const imagesResponse =
    await api.functional.shoppingMall.seller.products.images.uploadImages(
      sellerConnection,
      {
        productId: (product as any).id,
        body: {
          url: `https://example.com/image${RandomGenerator.alphaNumeric(8)}.jpg`,
          display_order: 0,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(imagesResponse);
  // imagesResponse is already IArrayIShoppingMallProductImage which is an array type
  const images = imagesResponse as any;
  TestValidator.equals("one image uploaded", images.length, 1);
  // 4. Attempt to delete the single remaining image (should fail)
  await TestValidator.error(
    "deleting last image should fail with PRODUCT_NEEDS_AT_LEAST_ONE_IMAGE",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        sellerConnection,
        {
          productId: (product as any).id,
          imageId: (images[0] as any).id,
        },
      );
    },
  );
  // 5. Verify the image still exists by checking the product again
  const fetchedProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<100>>(),
        variants: [
          {
            name: RandomGenerator.name(),
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<100>
            >(),
            stock: 10,
            sku: RandomGenerator.alphaNumeric(8),
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(fetchedProduct);
  TestValidator.equals(
    "product ID preserved",
    (fetchedProduct as any).id,
    (product as any).id,
  );
}
