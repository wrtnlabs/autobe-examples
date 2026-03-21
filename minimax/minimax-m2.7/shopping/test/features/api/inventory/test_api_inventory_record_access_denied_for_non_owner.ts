import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test that a seller cannot retrieve inventory records for another seller's product variant.
 *
 * Steps:
 * 1. Register and login as seller A (record owner)
 * 2. Create product and variant as seller A
 * 3. Add inventory to create a record
 * 4. Register and login as seller B (different seller)
 * 5. Attempt to call GET on seller A's inventory record using seller A's productId, variantId, and recordId
 * 6. Expected: Returns 403 Forbidden because the product does not belong to seller B
 *
 * Validates ownership validation on product level.
 */
export async function test_api_inventory_record_access_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and login as seller A (record owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  // Step 2: Create product as seller A
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(productA);
  // Step 3: Create variant for seller A's product
  const variantA =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
      },
    );
  typia.assert(variantA);
  // Step 4: Add inventory to create a record
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerAConnection,
      {
        params: { productId: productA.id, variantId: variantA.id },
      },
    );
  typia.assert(inventoryRecord);
  // Step 5: Register and login as seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // Step 6: Attempt to call GET on seller A's inventory record using seller B's credentials
  // Expected: Returns 403 Forbidden because the product does not belong to seller B
  await TestValidator.httpError(
    "Seller B cannot access seller A's inventory record",
    403,
    async () =>
      await api.functional.ecommerceMall.seller.products.variants.inventory.at(
        sellerBConnection,
        {
          productId: productA.id,
          variantId: variantA.id,
          recordId: inventoryRecord.id,
        },
      ),
  );
}
