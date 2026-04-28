import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_inventory_record } from "../prepare/prepare_random_ecommerce_platform_inventory_record";

/**
 * Generate a random inventory adjustment record for a product variant for E2E testing.
 *
 * Creates an immutable inventory ledger entry attached to the product variant specified by productId and variantId. The adjustment includes a random quantity delta and business reason.
 *
 * This requires that the product and variant must exist beforehand, as the inventory record is scoped to a specific variant.
 */
export async function generate_random_ecommerce_platform_admin_products_variants_inventory_adjust(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformInventoryRecord.ICreate>;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IEcommercePlatformInventoryRecord> {
  const prepared: IEcommercePlatformInventoryRecord.ICreate =
    prepare_random_ecommerce_platform_inventory_record(props.body);
  const result: IEcommercePlatformInventoryRecord =
    await api.functional.ecommercePlatform.admin.products.variants.inventory.adjust(
      connection,
      {
        productId: props.params.productId,
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
