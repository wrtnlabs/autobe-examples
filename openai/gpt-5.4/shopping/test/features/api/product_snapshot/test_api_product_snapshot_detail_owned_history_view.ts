import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_images_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_snapshot_detail_owned_history_view(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const originalProductBody = {
    shopping_mall_category_id: null,
    name: `product-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: 12000,
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: originalProductBody,
      },
    );
  typia.assert(product);
  const originalVariantBody = {
    sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    option_summary: `Color ${RandomGenerator.alphabets(4)} / Size ${RandomGenerator.alphabets(3)}`,
    price: 13500,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: originalVariantBody,
      },
    );
  typia.assert(variant);
  const imageBodies = [
    {
      image_uri: typia.random<string & tags.Format<"uri">>(),
      sequence: 1,
      is_thumbnail: false,
    } satisfies IShoppingMallProductImage.ICreate,
    {
      image_uri: typia.random<string & tags.Format<"uri">>(),
      sequence: 2,
      is_thumbnail: true,
    } satisfies IShoppingMallProductImage.ICreate,
    {
      image_uri: typia.random<string & tags.Format<"uri">>(),
      sequence: 3,
      is_thumbnail: false,
    } satisfies IShoppingMallProductImage.ICreate,
  ] as const;
  const createdImages = await ArrayUtil.asyncMap(imageBodies, async (body) => {
    const image =
      await generate_random_shopping_mall_seller_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body,
        },
      );
    typia.assert(image);
    return image;
  });
  const updatedProductBody = {
    name: `updated-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.content({ paragraphs: 3 }),
    base_price: 21000,
    status: "paused",
  } satisfies IShoppingMallProduct.IUpdate;
  const updatedProduct =
    await api.functional.shoppingMall.seller.seller_products.update(
      sellerConnection,
      {
        productId: product.id,
        body: updatedProductBody,
      },
    );
  typia.assert(updatedProduct);
  TestValidator.equals(
    "seller id matches product owner",
    product.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "product id remains stable after update",
    updatedProduct.id,
    product.id,
  );
  TestValidator.equals(
    "updated product name applied",
    updatedProduct.name,
    updatedProductBody.name,
  );
  TestValidator.equals(
    "updated product description applied",
    updatedProduct.description,
    updatedProductBody.description,
  );
  TestValidator.equals(
    "updated product base price applied",
    updatedProduct.base_price,
    updatedProductBody.base_price,
  );
  TestValidator.equals(
    "updated product status applied",
    updatedProduct.status,
    updatedProductBody.status,
  );
  TestValidator.notEquals(
    "live product name differs from original",
    updatedProduct.name,
    originalProductBody.name,
  );
  TestValidator.notEquals(
    "live product description differs from original",
    updatedProduct.description,
    originalProductBody.description,
  );
  TestValidator.notEquals(
    "live product base price differs from original",
    updatedProduct.base_price,
    originalProductBody.base_price,
  );
  TestValidator.notEquals(
    "live product status differs from original",
    updatedProduct.status,
    originalProductBody.status,
  );
  TestValidator.equals(
    "created variant belongs to product",
    variant.product.id,
    product.id,
  );
  TestValidator.equals(
    "created variant sku preserved",
    variant.sku_code,
    originalVariantBody.sku_code,
  );
  TestValidator.equals(
    "created variant option summary preserved",
    variant.option_summary,
    originalVariantBody.option_summary,
  );
  TestValidator.equals(
    "created variant price preserved",
    variant.price,
    originalVariantBody.price ?? null,
  );
  createdImages.forEach((image, index) => {
    TestValidator.equals(
      `created image ${index} belongs to product`,
      image.product.id,
      product.id,
    );
    TestValidator.equals(
      `created image ${index} uri preserved`,
      image.image_uri,
      imageBodies[index].image_uri,
    );
    TestValidator.equals(
      `created image ${index} sequence preserved`,
      image.sequence,
      imageBodies[index].sequence ?? image.sequence,
    );
    TestValidator.equals(
      `created image ${index} thumbnail preserved`,
      image.is_thumbnail,
      imageBodies[index].is_thumbnail ?? image.is_thumbnail,
    );
  });
  const thumbnailImages = createdImages.filter((image) => image.is_thumbnail);
  TestValidator.equals(
    "single thumbnail image exists",
    thumbnailImages.length,
    1,
  );
  TestValidator.equals(
    "thumbnail image sequence is preserved",
    thumbnailImages[0]?.sequence,
    2,
  );
}
