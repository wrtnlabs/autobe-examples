import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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

export async function test_api_seller_inventory_record_stock_restock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Retrieve inventory record using random UUID
  const inventoryRecord =
    await api.functional.ecommerceMall.seller.inventory_records.at(
      sellerConnection,
      {
        inventoryRecordId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(inventoryRecord);
  // 3. Validate required fields are present and non-null
  TestValidator.predicate(
    "inventory record has valid uuid id",
    inventoryRecord.id !== undefined,
  );
  TestValidator.predicate(
    "inventory record has variant id",
    inventoryRecord.variant_id !== undefined,
  );
  TestValidator.predicate(
    "inventory record has quantity change",
    inventoryRecord.quantity_change !== undefined,
  );
  TestValidator.predicate(
    "inventory record has remaining quantity",
    inventoryRecord.remaining_quantity !== undefined,
  );
  TestValidator.predicate(
    "inventory record has reason",
    inventoryRecord.reason !== undefined,
  );
  TestValidator.predicate(
    "inventory record has type",
    inventoryRecord.type !== undefined,
  );
  TestValidator.predicate(
    "inventory record has created_at timestamp",
    inventoryRecord.created_at !== undefined,
  );
  TestValidator.predicate(
    "inventory record has updated_at timestamp",
    inventoryRecord.updated_at !== undefined,
  );
  // 4. Validate restock-specific fields (positive quantity for restock)
  TestValidator.predicate(
    "quantity change is integer",
    Number.isInteger(inventoryRecord.quantity_change),
  );
  TestValidator.predicate(
    "remaining quantity is integer",
    Number.isInteger(inventoryRecord.remaining_quantity),
  );
  TestValidator.predicate(
    "quantity change represents stock movement",
    inventoryRecord.quantity_change !== 0,
  );
  // 5. Validate variant reference
  typia.assert(inventoryRecord.variant);
  TestValidator.predicate(
    "variant has valid stock quantity",
    inventoryRecord.variant.stockQuantity >= 0,
  );
  TestValidator.predicate(
    "variant has valid SKU",
    inventoryRecord.variant.sku.length > 0,
  );
  TestValidator.predicate(
    "variant has valid product reference",
    inventoryRecord.variant.product.id.length > 0,
  );
  TestValidator.predicate(
    "variant has valid base price",
    inventoryRecord.variant.basePrice >= 0,
  );
}