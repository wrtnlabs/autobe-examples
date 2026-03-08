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

export async function test_api_seller_inventory_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 2. Retrieve a product variant to get variantId and seller's product context
  // We use random IDs to simulate existing product/variant scenario
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variant = await api.functional.ecommerceMall.products.variants.at(
    sellerConnection,
    {
      productId,
      variantId,
    },
  );
  typia.assert(variant);
  // 3. Perform three stock change operations via PUT endpoint
  // Each operation should create a new inventory record on the server
  // First restocking: +10 units
  const currentStock = variant.stockQuantity;
  const restock1Result =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          stock_quantity: currentStock + 10,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(restock1Result);
  // Second restocking: +5 units
  const restock2Result =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          stock_quantity: currentStock + 15,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(restock2Result);
  // Third adjustment: -2 units (damaged goods)
  const adjustmentResult =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          stock_quantity: currentStock + 13,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(adjustmentResult);
  // 4. Retrieve individual inventory records by ID
  // Since the update endpoint returns IEcommerceMallProductVariant (not inventory records),
  // we use random IDs to test the retrieval endpoint
  const inventoryRecordId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const inventoryRecordId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const inventoryRecordId3: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve first inventory record
  const record1 =
    await api.functional.ecommerceMall.seller.variants.inventory_records.at(
      sellerConnection,
      {
        variantId,
        inventoryRecordId: inventoryRecordId1,
      },
    );
  typia.assert(record1);
  // Retrieve second inventory record
  const record2 =
    await api.functional.ecommerceMall.seller.variants.inventory_records.at(
      sellerConnection,
      {
        variantId,
        inventoryRecordId: inventoryRecordId2,
      },
    );
  typia.assert(record2);
  // Retrieve third inventory record
  const record3 =
    await api.functional.ecommerceMall.seller.variants.inventory_records.at(
      sellerConnection,
      {
        variantId,
        inventoryRecordId: inventoryRecordId3,
      },
    );
  typia.assert(record3);
  // 5. Validation
  TestValidator.equals(
    "seller approval status approved",
    seller.approval_status,
    "approved",
  );
  // Validate variant ownership context
  TestValidator.equals(
    "variant product matches",
    variant.product.id,
    productId,
  );
  // Validate inventory record structure
  TestValidator.equals(
    "record1 has valid variant reference",
    record1.variant.id,
    variantId,
  );
  TestValidator.equals(
    "record2 has valid variant reference",
    record2.variant.id,
    variantId,
  );
  TestValidator.equals(
    "record3 has valid variant reference",
    record3.variant.id,
    variantId,
  );
  // Validate inventory record immutability by retrieving same record twice
  const record1RetrievedTwice =
    await api.functional.ecommerceMall.seller.variants.inventory_records.at(
      sellerConnection,
      {
        variantId,
        inventoryRecordId: inventoryRecordId1,
      },
    );
  typia.assert(record1RetrievedTwice);
  TestValidator.equals(
    "inventory record immutable same ID",
    record1.quantity_change,
    record1RetrievedTwice.quantity_change,
  );
  TestValidator.equals(
    "inventory record reason immutable",
    record1.reason,
    record1RetrievedTwice.reason,
  );
  // Validate chronological timestamps
  TestValidator.predicate(
    "record1 timestamp is valid date-time",
    () => !isNaN(Date.parse(record1.timestamp)),
  );
  TestValidator.predicate(
    "record2 timestamp is valid date-time",
    () => !isNaN(Date.parse(record2.timestamp)),
  );
  TestValidator.predicate(
    "record3 timestamp is valid date-time",
    () => !isNaN(Date.parse(record3.timestamp)),
  );
  // Validate variant stock quantity consistency
  TestValidator.equals(
    "restock1 updated stock quantity",
    restock1Result.stockQuantity,
    currentStock + 10,
  );
  TestValidator.equals(
    "restock2 updated stock quantity",
    restock2Result.stockQuantity,
    currentStock + 15,
  );
  TestValidator.equals(
    "adjustment updated stock quantity",
    adjustmentResult.stockQuantity,
    currentStock + 13,
  );
  // Validate seller ownership by checking variant's product seller
  TestValidator.equals(
    "variant belongs to seller's product",
    variant.product.seller.id,
    seller.id,
  );
}
