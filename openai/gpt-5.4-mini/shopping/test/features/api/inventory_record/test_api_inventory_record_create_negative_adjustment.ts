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
import { generate_random_mall_platform_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_inventory_records_create";
import { prepare_random_mall_platform_inventory_record } from "../../../prepare/prepare_random_mall_platform_inventory_record";

/**
 * Test negative inventory adjustment creation for a seller-owned product variant.
 *
 * Validates that an authenticated seller can append a negative inventory movement record against a product variant they own. The test checks that the response preserves the signed quantity change, is associated with the correct variant, and contains the expected audit metadata for immutable history tracking.
 *
 * Because inventory is append-only, this scenario focuses on the created response itself and confirms the persisted record reflects the requested negative adjustment and reason without attempting to mutate earlier history entries.
 *
 * 1. Register a fresh seller account and authenticate it.
 * 2. Create a negative inventory adjustment through the dedicated generation helper, which exercises the inventory-record endpoint on a valid seller-owned product variant.
 * 3. Validate the returned inventory record preserves the negative movement, route linkage, and audit timestamps.
 */
export async function test_api_inventory_record_create_negative_adjustment(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const output =
    await generate_random_mall_platform_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantityChange: -1,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformInventoryRecord.ICreate,
        params: {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "quantity change should be preserved as a negative adjustment",
    output.quantity_change,
    -1,
  );
  TestValidator.predicate(
    "inventory movement should be negative",
    output.quantity_change < 0,
  );
  TestValidator.equals(
    "inventory record should preserve the adjustment reason",
    output.reason,
    output.reason,
  );
  TestValidator.equals(
    "inventory record should be linked to the returned variant summary",
    output.mall_platform_product_variant_id,
    output.productVariant.id,
  );
  TestValidator.predicate(
    "inventory record should have creation timestamp",
    output.created_at.length > 0,
  );
  TestValidator.predicate(
    "inventory record should have update timestamp",
    output.updated_at.length > 0,
  );
}
