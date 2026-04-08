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

export async function test_api_inventory_record_retrieve_owned_variant_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: 1000,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          optionValues: `option-${RandomGenerator.alphaNumeric(6)}`,
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const quantityChange = 7 as number & tags.Type<"int32">;
  const reason = `inventory-adjustment-${RandomGenerator.alphaNumeric(8)}`;
  const inventoryRecord =
    await generate_random_mall_platform_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantityChange,
          reason,
        } satisfies IMallPlatformInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  const fetched =
    await api.functional.mallPlatform.seller.products.variants.inventoryRecords.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        inventoryRecordId: inventoryRecord.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("inventory record id", fetched.id, inventoryRecord.id);
  TestValidator.equals(
    "inventory record variant reference",
    fetched.mall_platform_product_variant_id,
    variant.id,
  );
  TestValidator.equals(
    "inventory record quantity change",
    fetched.quantity_change,
    quantityChange,
  );
  TestValidator.equals("inventory record reason", fetched.reason, reason);
  TestValidator.equals(
    "inventory record created timestamp",
    fetched.created_at,
    inventoryRecord.created_at,
  );
  TestValidator.equals(
    "inventory record updated timestamp",
    fetched.updated_at,
    inventoryRecord.updated_at,
  );
  TestValidator.equals(
    "inventory record deleted timestamp",
    fetched.deleted_at,
    inventoryRecord.deleted_at,
  );
  TestValidator.equals(
    "inventory history lookup stays on the requested record",
    fetched.productVariant.id,
    variant.id,
  );
}
