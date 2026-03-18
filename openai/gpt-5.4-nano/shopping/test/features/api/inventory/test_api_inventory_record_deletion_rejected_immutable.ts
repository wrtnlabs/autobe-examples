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

export async function test_api_inventory_record_deletion_rejected_immutable(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers ??= {};
  authConnection.headers.Authorization = authorized.token.access;
  const inventoryRecordId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deletion should be rejected for immutable inventory history",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.shoppingMall.member.inventoryRecords.erase(
        authConnection,
        { inventoryRecordId },
      );
    },
  );
  await TestValidator.predicate(
    "inventory record should still exist or remain immutable",
    async () => {
      try {
        await api.functional.shoppingMall.member.inventoryRecords.erase(
          authConnection,
          { inventoryRecordId },
        );
        return false;
      } catch {
        return true;
      }
    },
  );
}
