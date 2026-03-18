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

export async function test_api_snapshot_parties_update_retry_idempotent_visibility(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const partyTypeA = typia.random<string>();
  const partyIdA = typia.random<string & tags.Format<"uuid">>();
  const partyTypeB = typia.random<string>();
  const partyIdB = typia.random<string & tags.Format<"uuid">>();
  const doRetry = async (
    body: IShoppingMallSnapshotParty.IUpdate,
  ): Promise<IShoppingMallSnapshotParty.ISummary[]> => {
    const first =
      await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
        adminConnection,
        {
          snapshotId,
          body,
        },
      );
    typia.assert(first);
    const second =
      await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
        adminConnection,
        {
          snapshotId,
          body,
        },
      );
    typia.assert(second);
    // SDK returns a single summary object (not array)
    TestValidator.equals("same can_view", first.can_view, second.can_view);
    TestValidator.equals(
      "same snapshot id",
      first.shopping_mall_snapshot_id,
      second.shopping_mall_snapshot_id,
    );
    TestValidator.equals(
      "same party_type",
      first.party_type,
      second.party_type,
    );
    TestValidator.equals("same party_id", first.party_id, second.party_id);
    // No duplicate relationship for same key in single-object response.
    // Snapshot payload/content immutability: compare full object stability
    // excluding identifiers/timestamps which may legitimately differ.
    TestValidator.equals(
      "summary stable",
      first,
      second,
      (key) =>
        key === "id" ||
        key === "created_at" ||
        key === "updated_at" ||
        key === "deleted_at",
    );
    return [first, second];
  };
  await doRetry({
    partyType: partyTypeA,
    partyId: partyIdA,
    canView: true,
  });
  await doRetry({
    partyType: partyTypeB,
    partyId: partyIdB,
    canView: false,
  });
}
