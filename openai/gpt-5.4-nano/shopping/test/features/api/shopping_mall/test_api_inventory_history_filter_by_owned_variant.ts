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
import { generate_random_shopping_mall_member_inventory_records_create } from "../../../generate/generate_random_shopping_mall_member_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";

export async function test_api_inventory_history_filter_by_owned_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Pass_1234_" + RandomGenerator.alphabets(8);
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.IJoin,
  });

  // 2) Create at least one inventory history record for an owned variant
  const createdStock = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const createdReserved = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const stock_quantity = createdStock;
  const reserved_quantity = createdReserved % (stock_quantity + 1);
  const available_quantity = stock_quantity - reserved_quantity;

  const inventoryTemplate = await prepare_random_shopping_mall_inventory_record(
    memberConnection as unknown as Parameters<
      typeof prepare_random_shopping_mall_inventory_record
    >[0],
  );

  const inventoryRecordA =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_variant_id:
            inventoryTemplate.shopping_mall_product_variant_id,
          stock_quantity,
          reserved_quantity,
          available_quantity,
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecordA);

  const productVariantId =
    inventoryRecordA.shopping_mall_product_variant_id;

  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const safeLimit = Math.min(10, limit) as typeof limit;

  const page1 = await api.functional.shoppingMall.member.inventoryRecords.index(
    memberConnection,
    {
      body: {
        productVariantId,
        page: 1,
        limit: safeLimit,
      } satisfies IShoppingMallInventoryRecord.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.predicate(
    "page1 items belong to requested productVariantId",
    () =>
      page1.data.every(
        (item) => item.shopping_mall_product_variant_id === productVariantId,
      ),
  );
  TestValidator.predicate("page1 quantity fields are coherent", () =>
    page1.data.every(
      (item) =>
        item.stock_quantity >= item.reserved_quantity &&
        item.reserved_quantity >= 0 &&
        item.available_quantity >= 0 &&
        item.available_quantity <= item.stock_quantity,
    ),
  );

  const isOrdered = (
    records: readonly IShoppingMallInventoryRecord.ISummary[],
  ): boolean => {
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];
      if (prev.created_at < curr.created_at) return false;
      if (prev.created_at === curr.created_at && prev.id < curr.id)
        return false;
    }
    return true;
  };

  TestValidator.predicate(
    "page1 ordering is descending by created_at then id",
    () => isOrdered(page1.data),
  );

  const identifiersPage1 = page1.data.map((r) => r.id);
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.shoppingMall.member.inventoryRecords.index(
        memberConnection,
        {
          body: {
            productVariantId,
            page: 2,
            limit: safeLimit,
          } satisfies IShoppingMallInventoryRecord.IRequest,
        },
      );
    typia.assert(page2);

    TestValidator.predicate(
      "page2 items belong to requested productVariantId",
      () =>
        page2.data.every(
          (item) => item.shopping_mall_product_variant_id === productVariantId,
        ),
    );
    TestValidator.predicate(
      "page1 and page2 do not overlap by id",
      () => page2.data.every((r) => !identifiersPage1.includes(r.id)),
    );
    TestValidator.predicate(
      "page2 ordering is descending by created_at then id",
      () => isOrdered(page2.data),
    );
  }
}
