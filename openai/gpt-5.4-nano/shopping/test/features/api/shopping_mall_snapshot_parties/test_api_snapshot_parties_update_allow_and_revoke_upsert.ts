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

export async function test_api_snapshot_parties_update_allow_and_revoke_upsert(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // NOTE: The SDK/DTO for this endpoint only accepts a single
  // IShoppingMallSnapshotParty.IUpdate per PATCH call and returns a single
  // ISummary. This test validates upsert/idempotency per entry.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const partyTypeA = typia.random<string>();
  const partyIdA = typia.random<string & tags.Format<"uuid">>();
  const partyTypeB = typia.random<string>();
  const partyIdB = typia.random<string & tags.Format<"uuid">>();
  const allowA1 =
    await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
      memberConnection,
      {
        snapshotId,
        body: {
          partyType: partyTypeA,
          partyId: partyIdA,
          canView: true,
        } satisfies IShoppingMallSnapshotParty.IUpdate,
      },
    );
  typia.assert(allowA1);
  TestValidator.equals(
    "snapshot id matches (A allow)",
    allowA1.shopping_mall_snapshot_id,
    snapshotId,
  );
  TestValidator.equals("A can_view is true", allowA1.can_view, true);
  const allowB1 =
    await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
      memberConnection,
      {
        snapshotId,
        body: {
          partyType: partyTypeB,
          partyId: partyIdB,
          canView: true,
        } satisfies IShoppingMallSnapshotParty.IUpdate,
      },
    );
  typia.assert(allowB1);
  TestValidator.equals(
    "snapshot id matches (B allow)",
    allowB1.shopping_mall_snapshot_id,
    snapshotId,
  );
  TestValidator.equals("B can_view is true", allowB1.can_view, true);
  // Idempotency: repeat A with canView=true
  const allowA2 =
    await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
      memberConnection,
      {
        snapshotId,
        body: {
          partyType: partyTypeA,
          partyId: partyIdA,
          canView: true,
        } satisfies IShoppingMallSnapshotParty.IUpdate,
      },
    );
  typia.assert(allowA2);
  TestValidator.equals(
    "A remains can_view=true after repeat",
    allowA2.can_view,
    true,
  );
  TestValidator.equals(
    "A party identity unchanged",
    allowA2.party_id,
    partyIdA,
  );
  TestValidator.equals(
    "A party type unchanged",
    allowA2.party_type,
    partyTypeA,
  );
  // Revoke B: canView=false
  const revokeB1 =
    await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
      memberConnection,
      {
        snapshotId,
        body: {
          partyType: partyTypeB,
          partyId: partyIdB,
          canView: false,
        } satisfies IShoppingMallSnapshotParty.IUpdate,
      },
    );
  typia.assert(revokeB1);
  TestValidator.equals("B becomes can_view=false", revokeB1.can_view, false);
  TestValidator.equals(
    "B party identity unchanged",
    revokeB1.party_id,
    partyIdB,
  );
  TestValidator.equals(
    "B party type unchanged",
    revokeB1.party_type,
    partyTypeB,
  );
  // Ensure only snapshot visibility parties data is affected from caller POV:
  // each response must keep the same snapshotId.
  TestValidator.equals(
    "snapshot id matches (A after repeat)",
    allowA2.shopping_mall_snapshot_id,
    snapshotId,
  );
  TestValidator.equals(
    "snapshot id matches (B after revoke)",
    revokeB1.shopping_mall_snapshot_id,
    snapshotId,
  );
}
