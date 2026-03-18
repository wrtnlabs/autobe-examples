import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_snapshot_parties_admin_can_view_visibility_entry(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // No snapshot creation/listing APIs were provided; attempt to retrieve a
  // visibility entry for an existing snapshot-party relationship.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshotPartyId = typia.random<string & tags.Format<"uuid">>();
  const party = await api.functional.shoppingMall.member.snapshots.parties.at(
    adminConnection,
    {
      snapshotId,
      snapshotPartyId,
    },
  );
  typia.assert(party);
  TestValidator.equals("id matches path param", party.id, snapshotPartyId);
  TestValidator.equals(
    "shopping_mall_snapshot_id matches path param",
    party.shopping_mall_snapshot_id,
    snapshotId,
  );
  TestValidator.equals(
    "deleted_at is null (active entry)",
    party.deleted_at,
    null,
  );
}
