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
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_update_reorder_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(seller);
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 100,
          status: RandomGenerator.alphabets(8),
          shopping_mall_category_id: null,
        },
      },
    );
  typia.assert(product);
  const firstImage: IShoppingMallProductImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 0,
          is_thumbnail: true,
        },
      },
    );
  typia.assert(firstImage);
  const targetImage: IShoppingMallProductImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 1,
          is_thumbnail: false,
        },
      },
    );
  typia.assert(targetImage);
  const newImageUri = typia.random<string & tags.Format<"uri">>();
  const updateBody = {
    imageUri: newImageUri,
    sequence: 0,
    isThumbnail: true,
  } satisfies IShoppingMallProductImage.IUpdate;
  const updated: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.seller_products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: targetImage.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated image keeps same identity",
    updated.id,
    targetImage.id,
  );
  TestValidator.equals(
    "updated image remains under same product",
    updated.product.id,
    product.id,
  );
  TestValidator.equals(
    "product identity is unchanged",
    updated.product.id,
    product.id,
  );
  TestValidator.equals(
    "updated image uri changes",
    updated.image_uri,
    newImageUri,
  );
  TestValidator.notEquals(
    "updated image uri differs from old uri",
    updated.image_uri,
    targetImage.image_uri,
  );
  TestValidator.equals(
    "updated image moved to first sequence",
    updated.sequence,
    0,
  );
  TestValidator.equals(
    "updated image becomes thumbnail",
    updated.is_thumbnail,
    true,
  );
}
