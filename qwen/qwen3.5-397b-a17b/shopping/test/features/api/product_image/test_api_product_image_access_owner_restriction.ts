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
 * Test that a seller cannot retrieve images from products owned by other sellers.
 *
 * This test verifies the ownership-based access control for product images.
 * A seller should only be able to access images belonging to their own products.
 *
 * Setup:
 * 1. Register first seller account (owner)
 * 2. First seller creates a product
 * 3. First seller uploads an image to their product
 * 4. Register second seller account (non-owner)
 *
 * Test Execution:
 * 1. Second seller attempts to GET the image using first seller's product and image IDs
 * 2. Verify the request is rejected with appropriate error
 *
 * Business Logic Verified:
 * - Image access restrictions based on product ownership
 * - Cross-seller image access is blocked
 * - Data isolation between seller accounts
 */
export async function test_api_product_image_access_owner_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner seller account
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
  // 2. Owner creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    ownerConnection,
    {},
  );
  typia.assert(product);
  // 3. Owner uploads an image to their product
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
  // 4. Create non-owner seller account
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
  // 5. Non-owner seller attempts to access owner's product image
  // This should fail with 404 or 403 error
  await TestValidator.error(
    "non-owner seller cannot access another seller's product image",
    async () => {
      await api.functional.shoppingMall.seller.products.images.at(
        nonOwnerConnection,
        {
          productId: product.id,
          imageId: image.id,
        },
      );
    },
  );
}
