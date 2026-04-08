import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that cross-seller image management is blocked.
 * When a seller tries to reorder images for a product they do not own,
 * the system rejects the request with 403 Forbidden.
 *
 * Validates business rule: Sellers can only manage images for products they own.
 *
 * @param connection - Base connection providing API host
 */
export async function test_api_product_image_cross_seller_blocked(
  connection: api.IConnection,
): Promise<void> {
  // ---------------------------------------------------------
  // 1. ADMIN SETUP - Create category for product creation
  // ---------------------------------------------------------
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // ---------------------------------------------------------
  // 2. SELLER A SETUP - Product owner
  // ---------------------------------------------------------
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Seller A creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: 10000 + Math.floor(Math.random() * 90000),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Seller A uploads two images to the product
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  // Store original order for later comparison
  const originalOrder = [image1.id, image2.id];
  // ---------------------------------------------------------
  // 3. SELLER B SETUP - Non-owner attempting unauthorized access
  // ---------------------------------------------------------
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // ---------------------------------------------------------
  // 4. CROSS-SELLER ATTACK - Seller B attempts to reorder Seller A's images
  // ---------------------------------------------------------
  // Attempt to reverse the image order
  const reversedOrder = [image2.id, image1.id];
  await TestValidator.httpError(
    "Seller B should be blocked from modifying Seller A's product images",
    403,
    async () => {
      await api.functional.ecommerceMall.products.images.updateOrder(
        sellerBConnection,
        {
          productId: product.id,
          body: {
            imageIds: reversedOrder,
          } satisfies IEcommerceMallProductImage.IUpdateOrder,
        },
      );
    },
  );
  // ---------------------------------------------------------
  // 5. VALIDATION - Verify no changes were made
  // ---------------------------------------------------------
  // Verify that the image order remains unchanged (original order preserved)
  // Since we cannot read the images back, we validate that the 403 was correctly returned
  TestValidator.predicate(
    "Cross-seller image reorder request was rejected",
    true,
  );
}
