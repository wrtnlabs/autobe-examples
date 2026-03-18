import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_inventory_record_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Choose a non-existent inventory record id
  const nonExistentInventoryRecordId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();
  // 3) Delete and expect not found
  await TestValidator.httpError(
    "delete missing inventory history should return not found",
    404,
    async () => {
      await api.functional.shoppingMall.member.inventoryRecords.erase(
        memberConnection,
        {
          inventoryRecordId: nonExistentInventoryRecordId,
        },
      );
    },
  );
}
