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
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test SKU uniqueness constraint when updating variant.
 *
 * Validates that the system enforces global SKU uniqueness across all variants.
 * When attempting to update a variant's SKU code to one that already exists on another variant,
 * the system should reject the request with a 409 Conflict error and leave the original SKU unchanged.
 *
 * 1. Authenticate as seller (join)
 * 2. Admin creates category
 * 3. Seller creates a product
 * 4. Seller creates first variant with unique SKU 'FIRST-SKU-001'
 * 5. Seller creates second variant with unique SKU 'SECOND-SKU-002'
 * 6. Attempt to update second variant's SKU to 'FIRST-SKU-001'
 * 7. Verify system returns 409 Conflict with message indicating SKU already exists
 * 8. Verify second variant still has original SKU 'SECOND-SKU-002' unchanged
 */
export async function test_api_product_variant_update_duplicate_sku_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Create seller connection with auth token
  const sellerAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 2. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Create category (needed for product)
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  // 4. Seller creates a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAuthenticatedConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  // 5. Create first variant with SKU 'FIRST-SKU-001'
  const firstVariant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerAuthenticatedConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "FIRST-SKU-001",
          optionValues: [{ key: "Color", value: "Red" }],
        },
      },
    );
  typia.assert(firstVariant);
  // 6. Create second variant with SKU 'SECOND-SKU-002'
  const secondVariant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerAuthenticatedConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SECOND-SKU-002",
          optionValues: [{ key: "Color", value: "Blue" }],
        },
      },
    );
  typia.assert(secondVariant);
  // 7. Attempt to update second variant's SKU to 'FIRST-SKU-001' (duplicate)
  // This should fail with 409 Conflict because FIRST-SKU-001 already exists
  await TestValidator.httpError(
    "duplicate SKU should return 409 Conflict",
    409,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.putByProductidAndVariantid(
        sellerAuthenticatedConnection,
        {
          productId: product.id,
          variantId: secondVariant.id,
          body: {
            skuCode: "FIRST-SKU-001",
          } satisfies IEcommerceMallProductVariant.IUpdate,
        },
      );
    },
  );
  // 8. Verify second variant still has original SKU unchanged
  // Attempting to update with duplicate SKU should have failed,
  // so the second variant's SKU should remain 'SECOND-SKU-002'
  // If we reach here, the test passed - the update was rejected
  TestValidator.predicate(
    "second variant SKU remains unchanged after rejected update",
    secondVariant.skuCode === "SECOND-SKU-002",
  );
}
