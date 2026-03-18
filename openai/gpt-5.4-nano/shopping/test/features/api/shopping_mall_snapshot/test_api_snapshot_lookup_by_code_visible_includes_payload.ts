import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_snapshot_lookup_by_code_visible_includes_payload(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // As we only have IShoppingMallSnapshot.IRequest (filter/pagination fields)
  // available in DTO definitions, we issue the request using those fields.
  // We'll attempt multiple combinations until we find a response with payload.
  const tries = 10;
  let snapshot: IShoppingMallSnapshot | null = null;
  for (let i = 0; i < tries && snapshot === null; i++) {
    const requestBody: IShoppingMallSnapshot.IRequest = {
      sourceType: typia.random<string>(),
      page: 1,
      limit: 1,
      sort: typia.random<string>(),
    };
    try {
      const output: IShoppingMallSnapshot =
        await api.functional.shoppingMall.member.snapshots.lookup_by_code.lookupByCode(
          memberConnection,
          { body: requestBody },
        );
      typia.assert(output);
      if (output.payload !== null) {
        snapshot = output;
      }
    } catch {
      // retry
    }
  }
  if (snapshot === null) {
    throw new Error("No visible snapshot with payload found");
  }
  TestValidator.predicate("payload exists", snapshot.payload !== null);
  TestValidator.predicate("has sourceType", snapshot.sourceType.length > 0);
  TestValidator.predicate(
    "has sourceEntityId",
    snapshot.sourceEntityId.length > 0,
  );
  TestValidator.predicate("has reason", snapshot.reason.length > 0);
  TestValidator.predicate("has createdAt", snapshot.createdAt.length > 0);
  TestValidator.predicate("has updatedAt", snapshot.updatedAt.length > 0);
  const payload = typia.assert(snapshot.payload!);
  TestValidator.equals(
    "payload.shopping_mall_snapshot_id matches snapshot.id",
    payload.shopping_mall_snapshot_id,
    snapshot.id,
  );
  TestValidator.predicate(
    "payload.payload is non-empty",
    payload.payload.length > 0,
  );
}
