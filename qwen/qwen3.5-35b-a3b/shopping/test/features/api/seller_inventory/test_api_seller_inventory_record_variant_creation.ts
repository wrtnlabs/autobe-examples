import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_inventory_record_variant_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Generate product variant with initial stock (auto-creates inventory record)
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `TEST-${RandomGenerator.alphaNumeric(6)}`,
          option_values: { size: "L", color: "blue" },
          stock_quantity: 10,
          price_override: null,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3. Get inventory record (auto-created during variant creation)
  // Note: In real scenario, variant creation would return inventory_record_id
  // For E2E test, we retrieve using the variant's id
  const inventoryRecordId = typia.random<string & tags.Format<"uuid">>();
  const inventoryRecord =
    await api.functional.ecommerceMall.seller.variants.inventory_records.at(
      sellerConnection,
      {
        variantId: variant.id,
        inventoryRecordId: inventoryRecordId,
      },
    );
  typia.assert(inventoryRecord);
  // 4. Validation
  TestValidator.equals(
    "inventory record matches variant",
    inventoryRecord.variant_id,
    variant.id,
  );
  TestValidator.equals(
    "quantity change equals initial stock",
    inventoryRecord.quantity_change,
    variant.stockQuantity,
  );
  TestValidator.equals(
    "reason is restocking for initial stock",
    inventoryRecord.reason,
    "restocking",
  );
  TestValidator.equals(
    "inventory timestamp matches variant creation",
    inventoryRecord.timestamp,
    variant.createdAt,
  );
}
