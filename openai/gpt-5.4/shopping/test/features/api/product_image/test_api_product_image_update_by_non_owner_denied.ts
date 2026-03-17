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

export async function test_api_product_image_update_by_non_owner_denied(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(ownerAuth);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuth = await authorize_seller_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(intruderAuth);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          status: RandomGenerator.pick(["sale", "draft", "active"] as const),
          shopping_mall_category_id: null,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const image =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      ownerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: typia.random<number & tags.Type<"int32">>(),
          is_thumbnail: true,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image);
  const originalImageUri = image.image_uri;
  const originalSequence = image.sequence;
  const originalIsThumbnail = image.is_thumbnail;
  const originalProductId = image.product.id;
  const originalImageId = image.id;
  const originalSellerId = product.seller.id;
  const updateBody = {
    imageUri: typia.random<string & tags.Format<"uri">>(),
    sequence: typia.random<number & tags.Type<"int32">>(),
    isThumbnail: false,
  } satisfies IShoppingMallProductImage.IUpdate;
  await TestValidator.httpError(
    "non-owner seller cannot update another seller's product image",
    403,
    async () => {
      await api.functional.shoppingMall.seller.seller_products.images.putByProductidAndImageid(
        intruderConnection,
        {
          productId: product.id,
          imageId: image.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "original image uri remains captured as created",
    image.image_uri,
    originalImageUri,
  );
  TestValidator.equals(
    "original image sequence remains captured as created",
    image.sequence,
    originalSequence,
  );
  TestValidator.equals(
    "original image thumbnail flag remains captured as created",
    image.is_thumbnail,
    originalIsThumbnail,
  );
  TestValidator.equals(
    "original image remains linked to original product",
    image.product.id,
    originalProductId,
  );
  TestValidator.equals(
    "original image id remains the protected target",
    image.id,
    originalImageId,
  );
  TestValidator.equals(
    "protected product remains owned by original seller",
    product.seller.id,
    originalSellerId,
  );
  TestValidator.notEquals(
    "intruder seller differs from owner seller",
    intruderAuth.id,
    ownerAuth.id,
  );
}
