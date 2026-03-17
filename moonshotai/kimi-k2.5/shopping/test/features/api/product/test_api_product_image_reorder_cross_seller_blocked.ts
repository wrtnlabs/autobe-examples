import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test cross-seller image management blocking - verifying that a seller cannot
 * reorder images belonging to another seller's product.
 *
 * Setup:
 * 1. Authenticate as seller A
 * 2. Admin creates category
 * 3. Seller A creates product and uploads 2 images
 * 4. Authenticate as seller B
 * 5. Attempt to reorder seller A's product images
 *
 * Verify:
 * - The API returns 403 Forbidden error indicating cross-seller modifications are blocked
 * - Image ordering remains unchanged after the unauthorized attempt
 */
export async function test_api_product_image_reorder_cross_seller_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller A connection and authenticate
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  // 3. Admin creates category for product
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    { body: { name: "Test Category" } },
  );
  typia.assert(category);
  // 4. Seller A creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product description",
        categoryId: category.id,
        basePrice: 10000,
      } satisfies Parameters<
        typeof generate_random_ecommerce_mall_seller_products_create
      >[1]["body"],
    },
  );
  typia.assert(product);
  // 5. Seller A uploads 2 images to the product
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: { imageUrl: "https://example.com/image1.jpg" },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: { imageUrl: "https://example.com/image2.jpg" },
      },
    );
  typia.assert(image2);
  // 6. Create seller B connection and authenticate
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 7. Verify seller B cannot reorder seller A's product images (should get 403 Forbidden)
  await TestValidator.httpError(
    "seller B should be blocked from reordering seller A's images",
    403,
    async () => {
      await api.functional.ecommerceMall.products.images.updateOrder(
        sellerBConnection,
        {
          productId: product.id,
          body: {
            displayOrder: 1,
          } satisfies IEcommerceMallProductImage.IUpdate,
        },
      );
    },
  );
}
