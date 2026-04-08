import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test attempting to reorder images for a product that does not belong to the authenticated seller.
 *
 * Validates the authorization boundary for product image management in the e-commerce platform.
 * This test ensures that sellers can only reorder images for their own products, and attempts
 * by one seller to modify another seller's product images are properly rejected.
 *
 * The test flow involves two sellers:
 * 1. Seller A (product owner) creates a product and uploads images
 * 2. Seller B (unauthorized) attempts to reorder Seller A's product images
 *
 * Expected behavior: HTTP 403 Forbidden response when Seller B tries to reorder
 * images belonging to Seller A's product. This validates that the platform properly
 * enforces ownership-based authorization for product image management.
 *
 * 1. Administrator registers and creates a product category for test product assignment.
 * 2. Seller A registers, logs in, creates a product, and uploads multiple images.
 * 3. Seller B registers and logs in as a separate seller account.
 * 4. Seller B attempts to reorder Seller A's product images via PATCH endpoint.
 * 5. Validates HTTP 403 Forbidden response indicating unauthorized access.
 */
export async function test_api_product_image_reorder_unauthorized_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category for product assignment
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Seller A setup - product owner
  const sellerACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAJoinResult = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    { body: sellerACredentials },
  );
  typia.assert(sellerAJoinResult);
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerACredentials.email,
      password: sellerACredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Seller A creates a product
  const sellerAProduct =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(sellerAProduct);
  // Seller A uploads multiple images to their product
  const image1 =
    await api.functional.ecommerceMall.seller.sellers.me.products.images.create(
      sellerAConnection,
      {
        productId: sellerAProduct.id,
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  const image2 =
    await api.functional.ecommerceMall.seller.sellers.me.products.images.create(
      sellerAConnection,
      {
        productId: sellerAProduct.id,
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  // 3. Seller B setup - unauthorized actor
  const sellerBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerBJoinResult = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    { body: sellerBCredentials },
  );
  typia.assert(sellerBJoinResult);
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBCredentials.email,
      password: sellerBCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Seller B creates their own product (to have valid product context)
  const sellerBProduct =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerBConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(sellerBProduct);
  // 5. Seller B attempts to reorder Seller A's product images
  // Expected: HTTP 403 Forbidden - seller cannot reorder another seller's product images
  await TestValidator.httpError(
    "unauthorized image reorder should return 403",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.images.update(
        sellerBConnection,
        {
          productId: sellerAProduct.id,
          body: {
            imageIds: [image2.id, image1.id],
          } satisfies IEcommerceMallProductImage.IReorderRequest,
        },
      );
    },
  );
}
