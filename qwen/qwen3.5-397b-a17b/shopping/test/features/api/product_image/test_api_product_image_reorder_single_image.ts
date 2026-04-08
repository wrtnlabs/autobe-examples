import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test product image reorder with a single image edge case.
 *
 * Validates the complete image reorder workflow when a product has only one image. This edge case tests that the reorder operation succeeds even when there is no practical reordering possible, ensuring the API handles boundary conditions gracefully without errors.
 *
 * The test creates a seller account, establishes a product with a single image, and submits a reorder request containing only that image at display_order 0. The operation should complete successfully and return the image with its original order unchanged.
 *
 * 1. Administrator creates a category for product association.
 * 2. Seller registers and authenticates to create product.
 * 3. Seller creates a product in the category.
 * 4. Seller uploads a single image to the product at display_order 0.
 * 5. Seller submits reorder request with the single image at display_order 0.
 * 6. Validates reorder succeeds, display_order remains 0, and image properties are unchanged.
 */
export async function test_api_product_image_reorder_single_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration and authentication
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Login with the same credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Upload single image at display_order 0
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerLoginConnection,
      {
        body: {
          display_order: 0,
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(image);
  // 5. Reorder with single image (edge case - no actual reordering possible)
  const reorderResult =
    await api.functional.shoppingMall.seller.products.images.update(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          images: [
            {
              imageId: image.id,
              displayOrder: 0,
            },
          ],
        } satisfies IShoppingMallProductImage.IReorderRequest,
      },
    );
  typia.assert(reorderResult);
  // 6. Validate reorder succeeded - response is array of images
  const reorderedImages = Array.isArray(reorderResult)
    ? reorderResult
    : [reorderResult];
  TestValidator.equals("single image in response", reorderedImages.length, 1);
  const reorderedImage = reorderedImages[0]!;
  TestValidator.equals(
    "single image display_order unchanged",
    reorderedImage.display_order,
    0,
  );
  TestValidator.equals("image ID matches", reorderedImage.id, image.id);
  TestValidator.equals("image URL unchanged", reorderedImage.url, image.url);
  TestValidator.predicate(
    "display_order is minimum value",
    reorderedImage.display_order >= 0,
  );
}
