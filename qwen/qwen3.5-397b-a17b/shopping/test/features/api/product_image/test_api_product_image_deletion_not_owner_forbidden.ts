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
 * Test that a seller cannot delete images from a product they do not own, receiving a 403 Forbidden error.
 *
 * Test Steps:
 * 1. Register the first seller account (owner) via /shoppingMall/auth/seller/join
 * 2. Create a product under the first seller via /shoppingMall/seller/products
 * 3. Upload an image to the product as the owner via /shoppingMall/seller/products/{productId}/images
 * 4. Register a second seller account (non-owner) via /shoppingMall/auth/seller/join
 * 5. Attempt to delete the image using the second seller's authentication via DELETE /shoppingMall/seller/products/{productId}/images/{imageId}
 * 6. Verify the response returns 403 Forbidden error
 *
 * Validation Points:
 * - The deletion request must be rejected with 403 status code
 * - Error message should indicate insufficient permissions or ownership violation
 * - This enforces the business rule that sellers can only manage images for their own products
 */
export async function test_api_product_image_deletion_not_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the first seller (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a product under the first seller
  const product = await generate_random_shopping_mall_seller_products_create(
    ownerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload an image to the product as the owner
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      ownerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image);
  // Verify the image was created successfully
  TestValidator.equals(
    "image belongs to product",
    (image.product as unknown as { id: string }).id,
    product.id,
  );
  TestValidator.predicate("image is active", image.deleted_at === null);
  // 4. Register a second seller account (non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_seller_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(nonOwnerAuth);
  // 5-6. Attempt to delete the image using the second seller's authentication
  // Verify the response returns 403 Forbidden error
  await TestValidator.httpError(
    "non-owner seller cannot delete product image",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        nonOwnerConnection,
        {
          productId: product.id,
          imageId: image.id,
        },
      );
    },
  );
}