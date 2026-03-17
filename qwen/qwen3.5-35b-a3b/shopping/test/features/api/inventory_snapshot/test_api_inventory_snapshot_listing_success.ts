import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventorySnapshot";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_inventory_records_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";

export async function test_api_inventory_snapshot_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(seller);
  // 2. Generate mock variant id for inventory records
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create multiple inventory records with restock operations
  const inventoryRecords: IEcommerceMallInventoryRecord[] =
    await ArrayUtil.asyncRepeat(3, async (index) => {
      const record =
        await generate_random_ecommerce_mall_seller_inventory_records_create(
          sellerConnection,
          {
            body: {
              ecommerce_mall_product_variant_id: variantId,
              quantity_change: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              reason: RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 3,
                wordMax: 6,
              }),
              type: "INCOMING",
              description: RandomGenerator.paragraph({
                sentences: 2,
                wordMin: 5,
                wordMax: 10,
              }),
            },
          },
        );
      typia.assert(record);
      return record;
    });
  // 4. Verify snapshot listing for first inventory record
  const firstInventoryRecord = inventoryRecords[0];
  const snapshotPage: IPageIEcommerceMallInventorySnapshot.ISummary =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerConnection,
      {
        inventoryRecordId: firstInventoryRecord.id,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1,
        },
      },
    );
  typia.assert(snapshotPage);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshotPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination total pages calculation",
    snapshotPage.pagination.pages,
    snapshotPage.pagination.records > 0
      ? Math.ceil(
          snapshotPage.pagination.records / snapshotPage.pagination.limit,
        )
      : 0,
  );
  // 6. Validate each snapshot in the result
  for (const snapshot of snapshotPage.data) {
    typia.assert(snapshot);
    // Validate snapshot structure
    TestValidator.equals("snapshot has id", snapshot.id !== undefined, true);
    TestValidator.equals(
      "snapshot has inventoryRecord",
      snapshot.inventoryRecord !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has variantId",
      snapshot.variantId !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has quantity",
      snapshot.quantity !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has reservedQuantity",
      snapshot.reservedQuantity !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has createdAt",
      snapshot.createdAt !== undefined,
      true,
    );
    // Validate ISO 8601 date-time format for createdAt
    const dateRegex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/;
    TestValidator.equals(
      "snapshot createdAt format is valid ISO 8601",
      dateRegex.test(snapshot.createdAt),
      true,
    );
    // Validate inventoryRecord reference
    typia.assert(snapshot.inventoryRecord);
    TestValidator.equals(
      "snapshot inventoryRecord matches queried record",
      snapshot.inventoryRecord.id,
      firstInventoryRecord.id,
    );
    // Validate variant reference
    TestValidator.equals(
      "snapshot variantId matches inventory record variant",
      snapshot.variantId,
      firstInventoryRecord.variant_id,
    );
    // Validate quantity is integer
    TestValidator.predicate(
      "snapshot quantity is integer",
      Number.isInteger(snapshot.quantity),
    );
    TestValidator.predicate(
      "snapshot reservedQuantity is integer",
      Number.isInteger(snapshot.reservedQuantity),
    );
  }
  // 7. Verify snapshots are sorted by created_at in descending order (newest first)
  if (snapshotPage.data.length > 1) {
    for (let i = 1; i < snapshotPage.data.length; i++) {
      const prevDate = new Date(snapshotPage.data[i - 1].createdAt).getTime();
      const currDate = new Date(snapshotPage.data[i].createdAt).getTime();
      TestValidator.equals(
        `snapshots are sorted descending at index ${i}`,
        prevDate >= currDate,
        true,
      );
    }
  }
  // 8. Test pagination with different page and limit
  const secondSnapshotPage: IPageIEcommerceMallInventorySnapshot.ISummary =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerConnection,
      {
        inventoryRecordId: firstInventoryRecord.id,
        body: {
          limit: 5,
          page: 1,
        },
      },
    );
  typia.assert(secondSnapshotPage);
  TestValidator.equals(
    "second page limit is correct",
    secondSnapshotPage.pagination.limit,
    5,
  );
  // 9. Verify snapshots for second inventory record are accessible
  const secondInventoryRecord = inventoryRecords[1];
  const secondRecordSnapshotPage: IPageIEcommerceMallInventorySnapshot.ISummary =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerConnection,
      {
        inventoryRecordId: secondInventoryRecord.id,
        body: {
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(secondRecordSnapshotPage);
  TestValidator.equals(
    "second record snapshots have correct pagination",
    secondRecordSnapshotPage.pagination.limit,
    20,
  );
  // 10. Validate snapshot data integrity with inventory record
  for (const snapshot of snapshotPage.data) {
    TestValidator.equals(
      "snapshot matches inventory record variant_id",
      snapshot.variantId,
      firstInventoryRecord.variant_id,
    );
    TestValidator.equals(
      "snapshot matches inventory record id in inventoryRecord",
      snapshot.inventoryRecord.id,
      firstInventoryRecord.id,
    );
  }
}
