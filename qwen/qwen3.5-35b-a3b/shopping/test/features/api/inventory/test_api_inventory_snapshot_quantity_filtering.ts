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

export async function test_api_inventory_snapshot_quantity_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // Create seller-specific connection with token
  const sellerApiConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuth.token.access },
  };
  // 2. Create inventory records with varying quantities
  // Generate a variant UUID for inventory records
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create inventory records with different quantity changes to get snapshots with varying quantities
  const quantityChanges = [100, 50, 75, 120] as const;
  const createdRecords: IEcommerceMallInventoryRecord[] = [];
  for (let index = 0; index < quantityChanges.length; index++) {
    const created =
      await api.functional.ecommerceMall.seller.inventory_records.create(
        sellerApiConnection,
        {
          body: {
            ecommerce_mall_product_variant_id: variantId,
            quantity_change: quantityChanges[index],
            reason: RandomGenerator.name(),
            type: "INCOMING",
          } satisfies IEcommerceMallInventoryRecord.ICreate,
        },
      );
    typia.assert(created);
    createdRecords.push(created);
  }
  // 3. Test quantity_gte filter (minimum quantity)
  const gteResult =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerApiConnection,
      {
        inventoryRecordId: createdRecords[0].id,
        body: {
          quantity_gte: 75,
          limit: 100,
        } satisfies IEcommerceMallInventorySnapshot.IRequest,
      },
    );
  typia.assert(gteResult);
  TestValidator.equals(
    "snapshot count with quantity_gte=75",
    gteResult.data.length,
    3,
  );
  // 4. Test quantity_lte filter (maximum quantity)
  const lteResult =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerApiConnection,
      {
        inventoryRecordId: createdRecords[0].id,
        body: {
          quantity_lte: 75,
          limit: 100,
        } satisfies IEcommerceMallInventorySnapshot.IRequest,
      },
    );
  typia.assert(lteResult);
  TestValidator.equals(
    "snapshot count with quantity_lte=75",
    lteResult.data.length,
    3,
  );
  // 5. Test combined filtering (quantity between 60 and 100)
  const combinedResult =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerApiConnection,
      {
        inventoryRecordId: createdRecords[0].id,
        body: {
          quantity_gte: 60,
          quantity_lte: 100,
          limit: 100,
        } satisfies IEcommerceMallInventorySnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "snapshot count with quantity 60-100",
    combinedResult.data.length,
    2,
  );
  // 6. Test sorting by quantity ascending
  const ascendingResult =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerApiConnection,
      {
        inventoryRecordId: createdRecords[0].id,
        body: {
          sort_by: "quantity",
          sort_order: "asc",
          limit: 100,
        } satisfies IEcommerceMallInventorySnapshot.IRequest,
      },
    );
  typia.assert(ascendingResult);
  const ascendingQuantities = ascendingResult.data.map((s) => s.quantity);
  for (let i = 1; i < ascendingQuantities.length; i++) {
    TestValidator.predicate(
      "quantity ascending order check at index " + i,
      ascendingQuantities[i] >= ascendingQuantities[i - 1],
    );
  }
  // 7. Test sorting by quantity descending
  const descendingResult =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerApiConnection,
      {
        inventoryRecordId: createdRecords[0].id,
        body: {
          sort_by: "quantity",
          sort_order: "desc",
          limit: 100,
        } satisfies IEcommerceMallInventorySnapshot.IRequest,
      },
    );
  typia.assert(descendingResult);
  const descendingQuantities = descendingResult.data.map((s) => s.quantity);
  for (let i = 1; i < descendingQuantities.length; i++) {
    TestValidator.predicate(
      "quantity descending order check at index " + i,
      descendingQuantities[i] <= descendingQuantities[i - 1],
    );
  }
  // 8. Verify pagination metadata reflects filtered results
  const filteredWithPagination =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerApiConnection,
      {
        inventoryRecordId: createdRecords[0].id,
        body: {
          quantity_gte: 60,
          quantity_lte: 100,
          limit: 10,
        } satisfies IEcommerceMallInventorySnapshot.IRequest,
      },
    );
  typia.assert(filteredWithPagination);
  TestValidator.equals(
    "pagination records matches filtered count",
    filteredWithPagination.pagination.records,
    filteredWithPagination.data.length,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    filteredWithPagination.pagination.pages,
    Math.ceil(
      filteredWithPagination.pagination.records /
        filteredWithPagination.pagination.limit,
    ),
  );
  // 9. Verify snapshot data includes reserved_quantity field
  if (filteredWithPagination.data.length > 0) {
    const firstSnapshot = filteredWithPagination.data[0];
    typia.assert(firstSnapshot);
    typia.assert(firstSnapshot.reservedQuantity);
    TestValidator.predicate(
      "snapshot has valid reserved_quantity",
      typeof firstSnapshot.reservedQuantity === "number",
    );
  }
}