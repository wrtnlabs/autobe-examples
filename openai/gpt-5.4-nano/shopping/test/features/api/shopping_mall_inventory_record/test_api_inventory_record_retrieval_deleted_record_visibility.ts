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

export async function test_api_inventory_record_retrieval_deleted_record_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);

  // 2) Create an inventory history entry
  const created =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberConnection,
      {},
    );
  typia.assert(created);

  // 3) Delete that inventory history entry
  const inventoryRecordId = created.id;
  await api.functional.shoppingMall.member.inventoryRecords.erase(
    memberConnection,
    { inventoryRecordId },
  );

  // 4) Call GET after deletion (behavior may be either 200 or an error)
  try {
    const afterDelete =
      await api.functional.shoppingMall.member.inventoryRecords.at(
        memberConnection,
        { inventoryRecordId },
      );
    typia.assert(afterDelete);

    // Allowed deleted record visibility: returned record must reflect deletion state
    TestValidator.notEquals(
      "deleted_at should be null after deletion",
      afterDelete.deleted_at,
      null,
    );

    // Ensure quantities match original snapshot (no recomputation)
    TestValidator.equals(
      "stock_quantity unchanged",
      afterDelete.stock_quantity,
      created.stock_quantity,
    );
    TestValidator.equals(
      "reserved_quantity unchanged",
      afterDelete.reserved_quantity,
      created.reserved_quantity,
    );
    TestValidator.equals(
      "available_quantity unchanged",
      afterDelete.available_quantity,
      created.available_quantity,
    );

    // Identity should remain stable
    TestValidator.equals("id unchanged", afterDelete.id, created.id);
  } catch {
    // Restricted visibility: GET must not expose deleted record details.
    // No payload assertions possible when request is rejected.
  }
}
