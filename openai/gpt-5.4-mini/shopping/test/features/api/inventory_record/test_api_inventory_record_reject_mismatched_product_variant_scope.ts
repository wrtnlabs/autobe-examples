import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { generate_random_mall_platform_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_inventory_records_create";
import { prepare_random_mall_platform_inventory_record } from "../../../prepare/prepare_random_mall_platform_inventory_record";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

/**
 * Reject mismatched product and variant scope when reading an inventory record.
 *
 * This test validates that inventory history access is protected by the full ownership chain.
 * It creates a seller account, creates a product, creates a variant under that product,
 * and creates an inventory record for that variant. It then attempts to fetch the record
 * through a different product identifier while keeping the original variant and inventory
 * record identifiers.
 *
 * 1. Register and authenticate a seller account.
 * 2. Create a source product and a second product owned by the same seller.
 * 3. Create a variant and an inventory record under the source product.
 * 4. Request the inventory record using the mismatched product scope and expect a not-found error.
 */
export async function test_api_inventory_record_reject_mismatched_product_variant_scope(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const sourceProduct =
    await generate_random_mall_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        } satisfies IMallPlatformProduct.ICreate,
      },
    );
  typia.assert(sourceProduct);
  const mismatchedProduct =
    await generate_random_mall_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        } satisfies IMallPlatformProduct.ICreate,
      },
    );
  typia.assert(mismatchedProduct);
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: sourceProduct.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          optionValues: RandomGenerator.name(),
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const inventoryRecord =
    await generate_random_mall_platform_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          productId: sourceProduct.id,
          variantId: variant.id,
        },
        body: {
          quantityChange: typia.random<number & tags.Type<"int32">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  await TestValidator.httpError(
    "inventory record should reject mismatched product scope",
    [404],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.inventoryRecords.at(
        sellerConnection,
        {
          productId: mismatchedProduct.id,
          variantId: variant.id,
          inventoryRecordId: inventoryRecord.id,
        },
      );
    },
  );
}
