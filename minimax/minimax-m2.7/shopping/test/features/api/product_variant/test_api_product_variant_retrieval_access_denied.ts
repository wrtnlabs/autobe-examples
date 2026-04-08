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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test retrieving a product variant belonging to another seller's product returns 403 Forbidden.
 *
 * Validates that the system properly enforces variant ownership at the product level.
 * Sellers should only be able to access variants from products they own. This test
 * ensures that variant ownership is correctly enforced by verifying that a seller
 * receives a 403 Forbidden response when attempting to retrieve a variant belonging
 * to another seller's product.
 *
 * 1. First seller registers and authenticates.
 * 2. First seller creates a product with a variant.
 * 3. Second seller registers and authenticates.
 * 4. Second seller attempts to retrieve the first seller's variant.
 * 5. System returns 403 Forbidden - access denied.
 *
 * Business Logic Validated:
 * - Variant ownership is properly enforced at the product level
 * - Sellers cannot access variants from products they do not own
 * - System correctly validates seller_id match between authenticated session and product owner
 */
export async function test_api_product_variant_retrieval_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller (owner) authentication
  const ownerSellerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerSellerConnection, {
    body: {
      email: "owner-seller@test.com",
      password: "TestPass123!",
      href: "https://test.com/register",
      referrer: "https://test.com",
    },
  });
  typia.assert(ownerAuth);
  // 2. Owner creates a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      ownerSellerConnection,
      {
        body: {
          name: "Exclusive Handbag",
          description: "Handcrafted leather handbag",
          basePrice: 299.99,
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(product);
  // 3. Owner creates a variant
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      ownerSellerConnection,
      {
        body: {
          skuCode: "HANDBAG-BROWN",
          optionValues: [{ key: "Color", value: "Brown" }],
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Second seller (intruder) authentication
  const intruderSellerConnection: api.IConnection = { host: connection.host };
  const intruderAuth = await authorize_seller_join(intruderSellerConnection, {
    body: {
      email: "intruder-seller@test.com",
      password: "TestPass123!",
      href: "https://test.com/register",
      referrer: "https://test.com",
    },
  });
  typia.assert(intruderAuth);
  // 5. Intruder attempts to retrieve the owner's variant - should get 403 Forbidden
  await TestValidator.httpError(
    "variant access denied for different seller",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.getByProductidAndVariantid(
        intruderSellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
        },
      );
    },
  );
}
