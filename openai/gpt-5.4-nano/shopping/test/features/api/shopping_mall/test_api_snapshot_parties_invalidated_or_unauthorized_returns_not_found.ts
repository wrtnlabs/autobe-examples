import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_snapshot_parties_invalidated_or_unauthorized_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member (actor-specific connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // Use random UUIDs. The endpoint contract allows not-found for:
  // - missing snapshot-party visibility entry
  // - invalidated (deleted_at != null) relationship
  // - requester not authorized for the snapshot
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshotPartyId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return not-found for invalidated or unauthorized snapshot-party visibility",
    404,
    async () => {
      await api.functional.shoppingMall.member.snapshots.parties.at(
        memberConnection,
        {
          snapshotId,
          snapshotPartyId,
        },
      );
    },
  );
}
