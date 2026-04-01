import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_product_variants_inventory_records_restock_create } from "../../../generate/generate_random_mall_platform_seller_product_variants_inventory_records_restock_create";
import { prepare_random_mall_platform_inventory_record } from "../../../prepare/prepare_random_mall_platform_inventory_record";

export async function test_api_inventory_record_restock_positive_stock_increases_availability(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: "https://example.com/seller/join",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const quantityChange = 5;
  const reason = `restock-${RandomGenerator.alphabets(8)}`;
  const inventoryRecord =
    await generate_random_mall_platform_seller_product_variants_inventory_records_restock_create(
      sellerConnection,
      {
        params: {
          productVariantId,
        },
        body: {
          quantityChange,
          reason,
        } satisfies IMallPlatformInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  TestValidator.equals(
    "inventory record quantity change should be positive",
    inventoryRecord.quantityChange,
    quantityChange,
  );
  TestValidator.equals(
    "inventory record reason should match request",
    inventoryRecord.reason,
    reason,
  );
  TestValidator.predicate(
    "restock should increase availability",
    inventoryRecord.quantityChange > 0,
  );
  TestValidator.predicate(
    "restock should be linked to a product variant",
    inventoryRecord.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "restock should not be a negative inventory movement",
    inventoryRecord.quantityChange > 0,
  );
}
