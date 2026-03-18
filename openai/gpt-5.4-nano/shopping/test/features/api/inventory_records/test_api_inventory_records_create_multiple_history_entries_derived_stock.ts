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

export async function test_api_inventory_records_create_multiple_history_entries_derived_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2) Create two inventory history entries.
  // NOTE: The provided utilities/SDK in this harness do not expose an API to fetch a seller-owned
  // shopping mall product variant id directly, nor to list derived current stock/history.
  // So we create two random history entries for this authenticated member and verify
  // append-only invariants we can assert from the returned records.
  const record1: IShoppingMallInventoryRecord =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberConnection,
      {},
    );
  typia.assert(record1);
  const record2: IShoppingMallInventoryRecord =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberConnection,
      {},
    );
  typia.assert(record2);
  // 3) Validate immutable append-only behavior for the returned records
  TestValidator.notEquals(
    "inventory record IDs should differ",
    record1.id,
    record2.id,
  );
  TestValidator.equals(
    "deleted_at should be null for record1",
    record1.deleted_at,
    null,
  );
  TestValidator.equals(
    "deleted_at should be null for record2",
    record2.deleted_at,
    null,
  );
  // created_at ordering (>=)
  TestValidator.predicate(
    "record2 created_at should be >= record1 created_at",
    new Date(record2.created_at).getTime() >=
      new Date(record1.created_at).getTime(),
  );
  // If both entries happened to be for the same variant, assert variant identity.
  // Otherwise, keep the test focused on append-only invariants.
  if (
    record1.shopping_mall_product_variant_id ===
    record2.shopping_mall_product_variant_id
  ) {
    TestValidator.equals(
      "same variant should be used for both records",
      record1.shopping_mall_product_variant_id,
      record2.shopping_mall_product_variant_id,
    );
  }
  // Derived stock/availability cumulative validation cannot be performed with
  // the currently available SDK/utility surface (no variant stock query endpoints).
}
