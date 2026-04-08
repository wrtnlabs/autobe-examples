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

export async function test_api_inventory_record_block_cross_seller_access(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerB);
  const product = await api.functional.mallPlatform.seller.products.create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.mallPlatform.seller.products.variants.create(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(12)}`,
          optionValues: `Option-${RandomGenerator.alphaNumeric(8)}`,
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const inventoryRecord =
    await api.functional.mallPlatform.seller.products.variants.inventoryRecords.create(
      sellerAConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantityChange: 10,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  await TestValidator.httpError(
    "cross-seller inventory record access should be rejected",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.inventoryRecords.at(
        sellerBConnection,
        {
          productId: product.id,
          variantId: variant.id,
          inventoryRecordId: inventoryRecord.id,
        },
      );
    },
  );
}
