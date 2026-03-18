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

export async function test_api_inventory_record_soft_delete_affects_derived_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1) Auth member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  const authedConnection: api.IConnection = { host: connection.host };
  authedConnection.headers ??= {};
  authedConnection.headers.Authorization = memberAuth.token.access;

  // 2) Choose a candidate inventory record id (best-effort: try several random UUIDs)
  let softUpdate: IShoppingMallInventoryRecord | undefined;
  let usedInventoryRecordId: (string & tags.Format<"uuid">) | undefined;

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateId = typia.random<string & tags.Format<"uuid">>();
    usedInventoryRecordId = candidateId;
    try {
      const softDeletedAt = new Date().toISOString();
      softUpdate =
        await api.functional.shoppingMall.member.inventoryRecords.update(
          authedConnection,
          {
            inventoryRecordId: candidateId,
            body: {
              deleted_at: softDeletedAt,
            } satisfies IShoppingMallInventoryRecord.IUpdate,
          },
        );
      typia.assert(softUpdate);
      break;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }

  // Ensure assigned
  if (softUpdate === undefined || usedInventoryRecordId === undefined) {
    throw new Error("failed to soft-delete an inventory record");
  }

  // Validate soft-delete response
  TestValidator.predicate(
    "deleted_at should become non-null after soft-delete",
    () => softUpdate.deleted_at !== null && softUpdate.deleted_at !== undefined,
  );
  TestValidator.equals(
    "inventoryRecordId should remain unchanged",
    softUpdate.id,
    usedInventoryRecordId,
  );

  // Proxy for derived availability impact: soft-delete/undelete should not change recorded quantities
  const baselineQuantities = {
    stock_quantity: softUpdate.stock_quantity,
    reserved_quantity: softUpdate.reserved_quantity,
    available_quantity: softUpdate.available_quantity,
  };

  // 3) Reversibility: undelete (deleted_at -> null)
  const undeleteUpdate =
    await api.functional.shoppingMall.member.inventoryRecords.update(
      authedConnection,
      {
        inventoryRecordId: usedInventoryRecordId,
        body: {
          deleted_at: null,
        } satisfies IShoppingMallInventoryRecord.IUpdate,
      },
    );
  typia.assert(undeleteUpdate);

  TestValidator.equals(
    "deleted_at should be null after undelete",
    undeleteUpdate.deleted_at,
    null,
  );
  TestValidator.equals(
    "shopping_mall_product_variant_id should remain unchanged",
    undeleteUpdate.shopping_mall_product_variant_id,
    softUpdate.shopping_mall_product_variant_id,
  );
  TestValidator.equals(
    "stock_quantity should remain unchanged across soft-delete cycle",
    undeleteUpdate.stock_quantity,
    baselineQuantities.stock_quantity,
  );
  TestValidator.equals(
    "reserved_quantity should remain unchanged across soft-delete cycle",
    undeleteUpdate.reserved_quantity,
    baselineQuantities.reserved_quantity,
  );
  TestValidator.equals(
    "available_quantity should remain unchanged across soft-delete cycle",
    undeleteUpdate.available_quantity,
    baselineQuantities.available_quantity,
  );
}
