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

export async function test_api_product_image_retrieve_current_gallery_item(
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
    },
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 100,
          status: "active",
        },
      },
    );
  typia.assert(product);
  const imageBody = {
    image_uri: `https://example.com/products/${product.id}/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
    sequence: 1,
    is_thumbnail: true,
  } satisfies IShoppingMallProductImage.ICreate;
  const createdImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: imageBody,
      },
    );
  typia.assert(createdImage);
  const retrieved = await api.functional.shoppingMall.products.images.at(
    sellerConnection,
    {
      productId: product.id,
      imageId: createdImage.id,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals("image id matches", retrieved.id, createdImage.id);
  TestValidator.equals(
    "image uri matches",
    retrieved.image_uri,
    createdImage.image_uri,
  );
  TestValidator.equals("image remains active", retrieved.deleted_at, null);
  TestValidator.equals(
    "sequence matches created image",
    retrieved.sequence,
    createdImage.sequence,
  );
  TestValidator.equals("first image sequence is one", retrieved.sequence, 1);
  TestValidator.equals(
    "thumbnail flag matches created image",
    retrieved.is_thumbnail,
    createdImage.is_thumbnail,
  );
  TestValidator.equals(
    "first image remains thumbnail",
    retrieved.is_thumbnail,
    true,
  );
  TestValidator.equals("product id matches", retrieved.product.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrieved.product.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrieved.product.description,
    product.description,
  );
  TestValidator.equals(
    "product base price matches",
    retrieved.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "product status matches",
    retrieved.product.status,
    product.status,
  );
  TestValidator.equals(
    "product created_at matches",
    retrieved.product.created_at,
    product.created_at,
  );
  TestValidator.equals(
    "product updated_at matches",
    retrieved.product.updated_at,
    product.updated_at,
  );
  TestValidator.equals(
    "product deleted_at matches",
    retrieved.product.deleted_at,
    product.deleted_at,
  );
  TestValidator.equals(
    "product seller id matches",
    retrieved.product.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "product seller email matches",
    retrieved.product.seller.email,
    product.seller.email,
  );
  TestValidator.equals(
    "product seller approval status matches",
    retrieved.product.seller.approval_status,
    product.seller.approval_status,
  );
  TestValidator.equals(
    "product seller rejection reason matches",
    retrieved.product.seller.rejection_reason,
    product.seller.rejection_reason,
  );
  TestValidator.equals(
    "product seller suspended flag matches",
    retrieved.product.seller.suspended,
    product.seller.suspended,
  );
  TestValidator.equals(
    "product seller banned flag matches",
    retrieved.product.seller.banned,
    product.seller.banned,
  );
  TestValidator.equals(
    "product seller created_at matches",
    retrieved.product.seller.created_at,
    product.seller.created_at,
  );
  TestValidator.equals(
    "product seller updated_at matches",
    retrieved.product.seller.updated_at,
    product.seller.updated_at,
  );
  TestValidator.equals(
    "product seller deleted_at matches",
    retrieved.product.seller.deleted_at,
    product.seller.deleted_at,
  );
  TestValidator.equals(
    "product category matches",
    retrieved.product.category,
    product.category,
  );
}
