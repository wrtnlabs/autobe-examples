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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_image_update_by_non_owner_denied(
  connection: api.IConnection,
): Promise<void> {
  const sellerOwnerConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerOwner: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerOwnerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerOwner);
  const sellerOtherConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerOther: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerOtherConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerOther);
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerOwnerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const originalImagesSnapshot: IShoppingMallProductImage[] = JSON.parse(
    JSON.stringify(product.images),
  ) as IShoppingMallProductImage[];
  typia.assert(originalImagesSnapshot);
  TestValidator.equals(
    "product belongs to owner seller",
    product.seller.id,
    sellerOwner.id,
  );
  TestValidator.notEquals(
    "other seller is different from owner",
    sellerOther.id,
    sellerOwner.id,
  );
  const updateBody = {
    imageUri: typia.random<string & tags.Format<"uri">>(),
    sequence: typia.random<number & tags.Type<"int32">>(),
    isThumbnail: false,
  } satisfies IShoppingMallProductImage.IUpdate;
  await TestValidator.error(
    "non-owner seller cannot update another seller product images",
    async () => {
      await api.functional.shoppingMall.products.images.update(
        sellerOtherConnection,
        {
          productId: product.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "failed non-owner attempt does not mutate captured local image state",
    product.images,
    originalImagesSnapshot,
  );
}
