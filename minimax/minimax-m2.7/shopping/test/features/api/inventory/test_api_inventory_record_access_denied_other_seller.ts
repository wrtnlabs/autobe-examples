import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test that a seller cannot access inventory records belonging to another seller.
 *
 * Validates the access control for inventory record retrieval. This test ensures that when a seller
 * attempts to access inventory records for a variant they do not own, the system properly denies
 * access. The endpoint should return 404 Not Found (not 403 Forbidden) to prevent information
 * leakage about the existence of resources owned by other sellers.
 *
 * The test workflow:
 * 1. Admin creates a category for product assignment
 * 2. Seller A registers, creates a product with variant, and adds an inventory record
 * 3. Seller B registers and authenticates separately
 * 4. Seller B attempts to retrieve Seller A's inventory record using Seller A's variantId and recordId
 * 5. System should deny access with 404 status
 *
 * Security Consideration: Using 404 instead of 403 prevents attackers from enumerating valid
 * resource IDs belonging to other sellers. This is a standard security practice for resource
 * isolation in multi-tenant systems.
 */
export async function test_api_inventory_record_access_denied_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller A registers and creates product with variant and inventory
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAJoinResult = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerAJoinResult);
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAConnection,
      {
        body: {
          categoryId: category.id,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          optionValues: [
            {
              key: "Size",
              value: "Large",
            },
          ],
          skuCode: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(variant);
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerAConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 3. Seller B registers and authenticates
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBJoinResult = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerBJoinResult);
  // 4. Seller B attempts to access Seller A's inventory record
  await TestValidator.httpError(
    "other seller cannot access inventory record - returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.variants.inventory.at(
        sellerBConnection,
        {
          variantId: variant.id,
          recordId: inventoryRecord.id,
        },
      );
    },
  );
}
