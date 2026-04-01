import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_thumbnail_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload multiple images (first image will be thumbnail with display_order 0)
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image3);
  // 4. Verify initial state - first image should be thumbnail (display_order 0)
  TestValidator.equals("first image is thumbnail", image1.display_order, 0);
  TestValidator.predicate(
    "second image has order > 0",
    image2.display_order > 0,
  );
  TestValidator.predicate(
    "third image has order > 0",
    image3.display_order > 0,
  );
  const originalThumbnailId = image1.id;
  const originalSecondImageOrder = image2.display_order;
  // 5. Change thumbnail by setting image2's display_order to 0
  const updatedImage2 =
    await api.functional.shoppingMall.seller.products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: image2.id,
        body: {
          display_order: 0,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage2);
  // 6. Verify the updated image is now the thumbnail
  TestValidator.equals(
    "updated image is now thumbnail",
    updatedImage2.display_order,
    0,
  );
  TestValidator.notEquals(
    "thumbnail changed from original",
    originalThumbnailId,
    updatedImage2.id,
  );
  // 7. Fetch image1 to verify it still exists and its order was adjusted
  const updatedImage1 =
    await api.functional.shoppingMall.seller.products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: image1.id,
        body: {},
      },
    );
  typia.assert(updatedImage1);
  // 8. Verify the original thumbnail still exists with a different display_order
  TestValidator.predicate(
    "original thumbnail still exists",
    updatedImage1.deleted_at === null,
  );
  TestValidator.predicate(
    "original thumbnail order changed",
    updatedImage1.display_order !== 0,
  );
  // 9. Verify image3 was not affected by the thumbnail change
  const updatedImage3 =
    await api.functional.shoppingMall.seller.products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: image3.id,
        body: {},
      },
    );
  typia.assert(updatedImage3);
  TestValidator.equals(
    "third image order unchanged",
    updatedImage3.display_order,
    image3.display_order,
  );
}
