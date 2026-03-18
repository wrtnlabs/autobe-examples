import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_inventory_record_retrieval_success_member_visible(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member setup + authorization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create an inventory record for an allowed product variant
  const createdRecord =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberConnection,
      {},
    );
  typia.assert(createdRecord);
  // 3) Retrieve it by id
  const firstFetch =
    await api.functional.shoppingMall.member.inventoryRecords.at(
      memberConnection,
      { inventoryRecordId: createdRecord.id },
    );
  typia.assert(firstFetch);
  TestValidator.equals(
    "inventory record id matches",
    firstFetch.id,
    createdRecord.id,
  );
  TestValidator.equals(
    "shopping_mall_product_variant_id matches",
    firstFetch.shopping_mall_product_variant_id,
    createdRecord.shopping_mall_product_variant_id,
  );
  TestValidator.equals(
    "stock_quantity matches",
    firstFetch.stock_quantity,
    createdRecord.stock_quantity,
  );
  TestValidator.equals(
    "reserved_quantity matches",
    firstFetch.reserved_quantity,
    createdRecord.reserved_quantity,
  );
  TestValidator.equals(
    "available_quantity matches",
    firstFetch.available_quantity,
    createdRecord.available_quantity,
  );
  TestValidator.equals(
    "created_at matches",
    firstFetch.created_at,
    createdRecord.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    firstFetch.updated_at,
    createdRecord.updated_at,
  );
  TestValidator.predicate(
    "updated_at >= created_at",
    firstFetch.updated_at >= firstFetch.created_at,
  );
  // Edge: if record is active, deleted_at must be null
  TestValidator.equals(
    "deleted_at matches stored value",
    firstFetch.deleted_at,
    createdRecord.deleted_at,
  );
  // 4) Repeated GET must be identical (no unintended state change)
  const secondFetch =
    await api.functional.shoppingMall.member.inventoryRecords.at(
      memberConnection,
      { inventoryRecordId: createdRecord.id },
    );
  typia.assert(secondFetch);
  TestValidator.equals(
    "repeated fetch returns identical record",
    secondFetch,
    firstFetch,
  );
}
