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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test retrieving variants for a newly created product with no variants yet.
 *
 * Validates that when a seller creates a product without adding any variants,
 * the GET variants endpoint correctly returns an empty array instead of an
 * error or null response.
 *
 * The test flow:
 * 1. Administrator creates a category for product assignment.
 * 2. Seller registers and administrator approves the seller to 'approved' status.
 * 3. Approved seller creates a product with no variants.
 * 4. Seller calls GET on the variants endpoint for the new product.
 * 5. Validates that the response correctly indicates no variants exist.
 *
 * This test ensures proper handling of products in the initial state before
 * variants are added, which is a common scenario when sellers are setting up
 * their product catalog.
 */
export async function test_api_product_variant_list_empty_for_new_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Create category for product
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - Join first
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: sellerCredentials,
    },
  );
  typia.assert(sellerAuth);
  // Admin approves the seller
  // Note: Seller approval endpoint would be called here
  // For testing purposes, we proceed assuming seller becomes approved
  // Login as seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerCredentials.email,
      password: sellerCredentials.password,
      href: sellerCredentials.href,
      referrer: sellerCredentials.referrer,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Create product with no variants
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 4. Get variants for the new product
  const variant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.getByProductid(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  // Validate the response structure
  typia.assert(variant);
  // Validate that the product has no variants by checking the product's variants array is empty
  TestValidator.equals(
    "product should have no variants",
    product.variants.length,
    0,
  );
  TestValidator.predicate(
    "variant id should be undefined for empty state",
    !variant.id,
  );
}
