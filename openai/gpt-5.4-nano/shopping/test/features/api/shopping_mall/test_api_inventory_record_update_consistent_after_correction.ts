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

export async function test_api_inventory_record_update_consistent_after_correction(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: memberAuthorized.token.access,
  };
  const inventoryRecordId = typia.random<string & tags.Format<"uuid">>();
  const stock_quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const reserved_quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const available_quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const updated_at = new Date().toISOString();
  const updatePayload = {
    stock_quantity,
    reserved_quantity,
    available_quantity,
    updated_at,
  } satisfies IShoppingMallInventoryRecord.IUpdate;
  const updated =
    await api.functional.shoppingMall.member.inventoryRecords.update(
      authorizedConnection,
      {
        inventoryRecordId,
        body: updatePayload,
      },
    );
  typia.assert(updated);
  TestValidator.equals("id matches", updated.id, inventoryRecordId);
  TestValidator.equals(
    "stock_quantity matches",
    updated.stock_quantity,
    stock_quantity,
  );
  TestValidator.equals(
    "reserved_quantity matches",
    updated.reserved_quantity,
    reserved_quantity,
  );
  TestValidator.equals(
    "available_quantity matches",
    updated.available_quantity,
    available_quantity,
  );
  TestValidator.equals("updated_at persisted", updated.updated_at, updated_at);
}
