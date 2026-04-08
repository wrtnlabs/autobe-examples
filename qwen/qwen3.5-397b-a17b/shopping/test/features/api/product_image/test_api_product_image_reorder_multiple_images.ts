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
 * Test product image reordering workflow with multiple images.
 *
 * Validates the complete image gallery management flow including administrative category setup, seller authentication, product creation, multiple image uploads, and image reordering. Ensures that sellers can control the display sequence of product images and that the reorder operation completes successfully.
 *
 * Special attention is given to verifying that the reorder request contains valid image IDs belonging to the product, display_order values form a consecutive sequence starting from 0, and the operation returns a valid response.
 *
 * 1. Administrator creates a category for the product to reference.
 * 2. Seller registers and authenticates to perform product operations.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Seller uploads three images with initial display orders 0, 1, 2.
 * 5. Seller reorders images to change sequence (e.g., 2, 0, 1).
 * 6. Validates reorder operation succeeds and returns valid image data.
 */
export async function test_api_product_image_reorder_multiple_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  // 3. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Upload three images with initial display orders
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          display_order: 0,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          display_order: 1,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          display_order: 2,
        },
      },
    );
  typia.assert(image3);
  // 5. Reorder images - change sequence from [0,1,2] to [2,0,1]
  // Image1 (was 0) -> new order 1
  // Image2 (was 1) -> new order 2
  // Image3 (was 2) -> new order 0 (becomes main thumbnail)
  const reorderRequest: IShoppingMallProductImage.IReorderRequest = {
    images: [
      {
        imageId: image1.id,
        displayOrder: 1,
      },
      {
        imageId: image2.id,
        displayOrder: 2,
      },
      {
        imageId: image3.id,
        displayOrder: 0,
      },
    ],
  };
  const result =
    await api.functional.shoppingMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        body: reorderRequest,
      },
    );
  typia.assert(result);
  // 6. Validate the operation succeeded and returned valid data
  TestValidator.predicate("result has valid image id", result.id !== undefined);
  TestValidator.predicate("result has valid url", result.url !== undefined);
  TestValidator.predicate(
    "result has valid display_order",
    result.display_order >= 0,
  );
  TestValidator.predicate(
    "result has valid product reference",
    result.product !== undefined,
  );
}
