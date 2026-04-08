import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test that creating a variant for a non-existent product or unauthorized product returns 404.
 * This validates proper access control and resource existence checking.
 * 1. Authenticate as seller
 * 2. Generate non-existent product ID
 * 3. Attempt to create variant
 * 4. Verify 404 Not Found response
 */
export async function test_api_product_variant_product_not_found_or_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller using Connection Isolation Pattern
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  // 2. Generate non-existent product ID (random UUID never created in DB)
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare valid variant creation body to test authorization, not validation
  const body = {
    skuCode: RandomGenerator.alphabets(8).toUpperCase(),
    price: 29900,
    options: [
      { optionName: "Color", optionValue: "Red" },
      { optionName: "Size", optionValue: "Large" },
    ],
  } satisfies IEcommerceMallProductVariant.ICreate;
  // 4. Verify 404 is returned for non-existent product
  await TestValidator.httpError(
    "should return 404 for non-existent product",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.create(
        sellerConnection,
        {
          productId: nonExistentProductId,
          body: body,
        },
      );
    },
  );
}
