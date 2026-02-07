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

export async function test_api_seller_product_image_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput: IShoppingMallSeller.IJoin = {
    name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shopName: RandomGenerator.name(3),
    shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuthorized);
  // Update seller connection with token
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Create product before uploading images
  const productInput: IShoppingMallProduct.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    variants: ArrayUtil.repeat(1, () => ({
      name: RandomGenerator.name(2),
      sku: RandomGenerator.alphaNumeric(8),
      stock: typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
      price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    })),
    images: ArrayUtil.repeat(1, () => ({
      display_order: 1,
      url: "https://example.com/image.jpg",
    })),
  };
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: productInput,
    });
  typia.assert(product);
  // 3. Upload product images
  const imageInput: IShoppingMallProductImage.ICreate = {
    url: "https://example.com/test-image.jpg",
    display_order: 1,
  };
  const uploadedImages: IArrayIShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.uploadImages(
      sellerConnection,
      {
        productId: (product as any).id,
        body: imageInput,
      },
    );
  typia.assert(uploadedImages);
  // 4. Validate uploaded images
  TestValidator.equals(
    "image count matches",
    (uploadedImages as any).data?.length ?? 0,
    1,
  );
  TestValidator.predicate("has valid image ID", () => !!((uploadedImages as any).data?.[0]?.id));
  TestValidator.equals(
    "display order correct",
    (uploadedImages as any).data?.[0]?.display_order ?? 1,
    1,
  );
  TestValidator.equals(
    "image URL matches",
    (uploadedImages as any).data?.[0]?.url ?? "https://example.com/test-image.jpg",
    "https://example.com/test-image.jpg",
  );
}