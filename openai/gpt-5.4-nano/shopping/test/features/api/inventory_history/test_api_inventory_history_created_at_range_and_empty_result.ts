import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_inventory_history_created_at_range_and_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join a new member account.
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {});
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2) Obtain inventory history records visible to the member.
  const firstPage =
    await api.functional.shoppingMall.member.inventoryRecords.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "at least two inventory history records should exist for the member",
    firstPage.data.length >= 2,
  );
  const records = firstPage.data;
  // 3) Pick two records to define a createdAt range.
  // Prefer same variant if possible.
  const firstVariantId: string = records[0].shopping_mall_product_variant_id;
  const sameVariantRecords = records.filter(
    (r) => r.shopping_mall_product_variant_id === firstVariantId,
  );
  const chosenPool =
    sameVariantRecords.length >= 2 ? sameVariantRecords : records;
  const chosenSortedByCreatedAsc = [...chosenPool].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const earlier = chosenSortedByCreatedAsc[0];
  const later = chosenSortedByCreatedAsc[chosenSortedByCreatedAsc.length - 1];
  const createdAtFrom = earlier.created_at;
  const createdAtTo = later.created_at;
  const requestWithVariant: IShoppingMallInventoryRecord.IRequest =
    chosenPool === sameVariantRecords
      ? {
          productVariantId: earlier.shopping_mall_product_variant_id,
          createdAtFrom,
          createdAtTo,
          page: 1,
          limit: 10,
        }
      : {
          createdAtFrom,
          createdAtTo,
          page: 1,
          limit: 10,
        };
  // 4) Call with created-at range filtering.
  const ranged =
    await api.functional.shoppingMall.member.inventoryRecords.index(
      memberConnection,
      {
        body: requestWithVariant,
      },
    );
  typia.assert(ranged);
  const fromMs = new Date(createdAtFrom).getTime();
  const toMs = new Date(createdAtTo).getTime();
  // 5a) Validate inclusive bounds.
  await ArrayUtil.asyncForEach(ranged.data, async (item) => {
    const createdMs = new Date(item.created_at).getTime();
    TestValidator.predicate(
      "created_at should be within inclusive [from,to]",
      createdMs >= fromMs && createdMs <= toMs,
    );
  });
  // 5b) Validate deterministic ordering: created_at DESC, then id DESC.
  const toBigInt = (uuid: string): bigint => {
    // Deterministic hash-like conversion to allow consistent DESC tie-break ordering.
    // We only use it for ordering validation where created_at is equal.
    // uuid is a string; convert to a bigint via base16.
    const hex = uuid.replace(/-/g, "");
    return BigInt(`0x${hex}`);
  };
  TestValidator.predicate(
    "results should be ordered by created_at DESC then id DESC",
    (() => {
      for (let i = 0; i < ranged.data.length - 1; i++) {
        const a = ranged.data[i];
        const b = ranged.data[i + 1];
        const aMs = new Date(a.created_at).getTime();
        const bMs = new Date(b.created_at).getTime();
        if (aMs !== bMs) {
          if (!(aMs > bMs)) return false;
        } else {
          // created_at equal => id DESC
          if (!(toBigInt(a.id) > toBigInt(b.id))) return false;
        }
      }
      return true;
    })(),
  );
  // 6) Empty result case: choose a non-overlapping window fully outside observed range.
  // Use far past window before the earliest observed record.
  const earliestObservedMs = new Date(records[0].created_at).getTime();
  const minObservedMs = Math.min(
    ...records.map((r) => new Date(r.created_at).getTime()),
  );
  const emptyToMs = minObservedMs - 60000; // 60 seconds before minimum
  const emptyFromMs = emptyToMs - 60000; // 60 seconds window
  const emptyFrom = new Date(emptyFromMs).toISOString();
  const emptyTo = new Date(emptyToMs).toISOString();
  const emptyRequest: IShoppingMallInventoryRecord.IRequest = {
    ...(chosenPool === sameVariantRecords
      ? { productVariantId: earlier.shopping_mall_product_variant_id }
      : null),
    createdAtFrom: emptyFrom,
    createdAtTo: emptyTo,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallInventoryRecord.IRequest;
  const emptyResult =
    await api.functional.shoppingMall.member.inventoryRecords.index(
      memberConnection,
      {
        body: emptyRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals("empty data array length", emptyResult.data.length, 0);
}
