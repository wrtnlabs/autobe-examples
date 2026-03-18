import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_create_for_owned_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageUri = `https://example.com/${RandomGenerator.alphaNumeric(16)}.jpg`;
  const altText = RandomGenerator.paragraph({ sentences: 2 });
  const created =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId,
        },
        body: {
          imageUri,
          displayOrder: 1,
          altText,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created image product reference",
    created.product.id,
    productId,
  );
  TestValidator.equals("created image uri", created.imageUri, imageUri);
  TestValidator.equals("created image display order", created.displayOrder, 1);
  TestValidator.equals("created image alt text", created.altText, altText);
  TestValidator.predicate(
    "created image has timestamps",
    () => created.createdAt.length > 0 && created.updatedAt.length > 0,
  );
  TestValidator.equals("created image is active", created.deletedAt, null);
  const secondImageUri = `https://example.com/${RandomGenerator.alphaNumeric(16)}-second.jpg`;
  const second =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId,
        },
        body: {
          imageUri: secondImageUri,
          displayOrder: 2,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "second image product reference",
    second.product.id,
    productId,
  );
  TestValidator.equals("second image uri", second.imageUri, secondImageUri);
  TestValidator.equals("second image display order", second.displayOrder, 2);
  TestValidator.equals(
    "thumbnail remains first image",
    created.displayOrder,
    1,
  );
  TestValidator.equals(
    "gallery ordering keeps first image as thumbnail",
    created.displayOrder < second.displayOrder,
    true,
  );
}
