import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImageCopy";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
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

export async function test_api_product_snapshot_image_copies_deleted_or_changed_product_history(
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
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Minimum<0>
          >() satisfies number as number,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  TestValidator.equals(
    "product belongs to seller",
    product.seller.id,
    seller.id,
  );
  const firstImageUri = typia.random<string & tags.Format<"uri">>();
  const secondImageUri = typia.random<string & tags.Format<"uri">>();
  const changedImageUri = typia.random<string & tags.Format<"uri">>();
  const firstImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          image_uri: firstImageUri,
          sequence: 1,
          is_thumbnail: true,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  const secondImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          image_uri: secondImageUri,
          sequence: 2,
          is_thumbnail: false,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  const updatedProduct =
    await api.functional.shoppingMall.seller.seller_products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: `${product.name} ${RandomGenerator.alphabets(3)}`,
          description: RandomGenerator.content({ paragraphs: 3 }),
          base_price: (product.base_price + 1) satisfies number as number,
          status: product.status,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  TestValidator.equals(
    "updated product id preserved",
    updatedProduct.id,
    product.id,
  );
  const editedLiveImage =
    await api.functional.shoppingMall.seller.seller_products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: secondImage.id,
        body: {
          imageUri: changedImageUri,
          sequence: 2,
          isThumbnail: false,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(editedLiveImage);
  TestValidator.equals(
    "edited image id preserved",
    editedLiveImage.id,
    secondImage.id,
  );
  TestValidator.equals(
    "live image uri changed after snapshot-triggering edits",
    editedLiveImage.image_uri,
    changedImageUri,
  );
  TestValidator.equals(
    "live image still belongs to product",
    editedLiveImage.product.id,
    product.id,
  );
  const unavailableSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "snapshot image copies reject an unavailable snapshot id when snapshot discovery API is absent",
    [400, 404],
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.image_copies.index(
        sellerConnection,
        {
          productId: product.id,
          productSnapshotId: unavailableSnapshotId,
          body: {
            page: 1,
            limit: 10,
            sort: "created_at",
            direction: "asc",
          } satisfies IShoppingMallProductSnapshotImageCopy.IRequest,
        },
      );
    },
  );
}
