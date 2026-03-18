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

export async function test_api_snapshot_parties_update_idempotent_reapply(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // The scenario expects an owned snapshotId supplied by the harness.
  // When such value is not provided to this test directly, generate a UUID
  // to keep the test compiling; the server will enforce ownership/validity.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const partyType = typia.random<string>();
  const partyId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    partyType,
    partyId,
    canView: true,
  } satisfies IShoppingMallSnapshotParty.IUpdate;
  const first =
    await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
      memberConnection,
      {
        snapshotId,
        body,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
      memberConnection,
      {
        snapshotId,
        body,
      },
    );
  typia.assert(second);
  TestValidator.equals("party id unchanged", second.party_id, first.party_id);
  TestValidator.equals(
    "party type unchanged",
    second.party_type,
    first.party_type,
  );
  TestValidator.equals(
    "snapshot id unchanged",
    second.shopping_mall_snapshot_id,
    first.shopping_mall_snapshot_id,
  );
  TestValidator.equals("can_view remains true", second.can_view, true);
  TestValidator.equals("relationship id unchanged", second.id, first.id);
}
