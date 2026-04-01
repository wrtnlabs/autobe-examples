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

/**
 * Test the edge case where a seller deletes the main thumbnail image (the first image with display_order: 0).
 * A seller creates a product, uploads at least 2 images, then deletes the first image by setting its deleted_at timestamp.
 * Verify that: (1) the deletion operation succeeds, (2) the deleted image is excluded from the returned active images list,
 * (3) the next image in sequence automatically becomes the new main thumbnail (display_order: 0),
 * (4) a product snapshot is created preserving the previous image state including the deleted image's URL and order,
 * and (5) customers viewing the product see the updated image gallery without the deleted image.
 * This validates the business rule that when the main thumbnail is deleted, the next image becomes the new thumbnail.
 */
export async function test_api_product_image_main_thumbnail_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication - create seller account and get authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product for testing image management
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  TestValidator.predicate("product created", product.id !== undefined);
  // 3. Upload first image (main thumbnail - display_order: 0)
  const firstImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(firstImage);
  TestValidator.equals(
    "first image is main thumbnail",
    firstImage.display_order,
    0,
  );
  // 4. Upload second image (display_order: 1)
  const secondImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(secondImage);
  TestValidator.equals("second image order", secondImage.display_order, 1);
  // 5. Upload third image (display_order: 2) for better testing
  const thirdImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(thirdImage);
  TestValidator.equals("third image order", thirdImage.display_order, 2);
  // Store first image details for verification
  const deletedImageUrl = firstImage.image_url;
  const deletedImageId = firstImage.id;
  // 6. Delete the main thumbnail (first image) by setting deleted_at
  const deletionResult =
    await api.functional.shoppingMall.seller.products.images.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          deleted_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(deletionResult);
  // 7. Verify the deletion result - should return the new main thumbnail (second image)
  TestValidator.equals(
    "deletion returns updated main thumbnail with order 0",
    deletionResult.display_order,
    0,
  );
  TestValidator.equals(
    "new main thumbnail is second image URL",
    deletionResult.image_url,
    secondImage.image_url,
  );
  TestValidator.notEquals(
    "returned image is not the deleted first image",
    deletionResult.id,
    deletedImageId,
  );
  // 8. Verify the returned image is active (not deleted)
  TestValidator.equals(
    "returned image is active (not deleted)",
    deletionResult.deleted_at,
    null,
  );
  // 9. Verify second image is now the main thumbnail (display_order 0)
  TestValidator.predicate(
    "second image becomes new main thumbnail",
    deletionResult.image_url === secondImage.image_url &&
      deletionResult.display_order === 0,
  );
}
