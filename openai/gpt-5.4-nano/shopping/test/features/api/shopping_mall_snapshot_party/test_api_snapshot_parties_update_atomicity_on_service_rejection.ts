import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_snapshot_parties_update_atomicity_on_service_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Register admin and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const partyA: IShoppingMallSnapshotParty.ISummary = {
    ...(await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
      { host: connection.host },
      {
        snapshotId,
        body: {
          partyType: "party_type_a",
          partyId: typia.random<string & tags.Format<"uuid">>(),
          canView: true,
        },
      },
    )),
  };
  const partyA_before = partyA.can_view;
  const rejectedPartyEntry = {
    partyType: partyA.party_type,
    partyId: partyA.party_id,
    canView: false,
  } satisfies IShoppingMallSnapshotParty.IUpdate;
  await TestValidator.error(
    "atomic update should be rejected when one party entry is not allowed",
    async () => {
      await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
        adminConnection,
        {
          snapshotId,
          body: {
            partyType: rejectedPartyEntry.partyType,
            partyId: rejectedPartyEntry.partyId,
            canView: rejectedPartyEntry.canView,
          },
        },
      );
    },
  );
  const partyA_afterResponse =
    await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
      adminConnection,
      {
        snapshotId,
        body: {
          partyType: partyA.party_type,
          partyId: partyA.party_id,
          canView: partyA_before,
        },
      },
    );
  typia.assert(partyA_afterResponse);
  TestValidator.equals(
    "party A can_view should remain unchanged after atomic rejection",
    partyA_afterResponse.can_view,
    partyA_before,
  );
  const partyA_update =
    await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
      adminConnection,
      {
        snapshotId,
        body: {
          partyType: partyA.party_type,
          partyId: partyA.party_id,
          canView: !partyA_before,
        },
      },
    );
  typia.assert(partyA_update);
  TestValidator.equals(
    "party A update should apply when called with valid entries only",
    partyA_update.can_view,
    !partyA_before,
  );
}
