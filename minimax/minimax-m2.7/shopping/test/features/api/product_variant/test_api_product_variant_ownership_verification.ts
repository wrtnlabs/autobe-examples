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
 * Test product variant ownership verification - ensures sellers cannot create variants for products they don't own.
 *
 * This test validates the platform's product ownership enforcement mechanism. The test creates two independent seller accounts, has the first seller create a product, and then verifies that the second seller cannot create variants for that product. The expected behavior is that the second seller's attempt to create a variant for the first seller's product should be rejected with HTTP 403 Forbidden.
 *
 * The test follows this flow:
 * 1. Administrator creates a category required for product assignment
 * 2. First seller registers and authenticates on the platform
 * 3. First seller creates a product under the category
 * 4. Second seller registers and authenticates (different account)
 * 5. Second seller attempts to create a variant using the first seller's product ID
 * 6. The system rejects the request with HTTP 403 Forbidden due to ownership violation
 *
 * This test ensures proper authorization boundaries between sellers and prevents unauthorized access to other sellers' products.
 */
export async function test_api_product_variant_ownership_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category for product assignment
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. First seller registers and authenticates
  const firstSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(firstSellerConnection, {});
  // 3. First seller creates a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      firstSellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Second seller registers and authenticates
  const secondSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(secondSellerConnection, {});
  // 5. Second seller attempts to create a variant for the first seller's product
  // Expected: HTTP 403 Forbidden - product does not belong to second seller
  await TestValidator.error(
    "second seller cannot create variant for first seller's product",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.create(
        secondSellerConnection,
        {
          productId: product.id,
          body: {
            skuCode: `VAR-${RandomGenerator.alphaNumeric(8)}`,
            optionValues: [
              {
                key: "Color",
                value: "Blue",
              },
            ],
          } satisfies IEcommerceMallProductVariant.ICreate,
        },
      );
    },
  );
}
