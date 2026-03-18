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

export async function test_api_snapshot_parties_update_admin_visibility_matrix(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials =
    typia.random<IShoppingMallAdmin.IJoin>() satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });

  // 2) SnapshotId and party IDs
  const snapshotId: string =
    (process.env.SNAPSHOT_ID ?? process.env.SHOPPING_MALL_SNAPSHOT_ID ?? "") ||
    typia.random<string & tags.Format<"uuid">>();

  const partyAId = typia.random<string & tags.Format<"uuid">>();
  const partyBId = typia.random<string & tags.Format<"uuid">>();

  const partyAType = RandomGenerator.pick(["owner", "user", "customer"] as const);
  const partyBType = RandomGenerator.pick(["admin", "user", "owner"] as const);

  const body = [
    {
      partyType: partyAType,
      partyId: partyAId,
      canView: true,
    },
    {
      partyType: partyBType,
      partyId: partyBId,
      canView: false,
    },
  ] satisfies IShoppingMallSnapshotParty.IUpdate[];

  const updateA: IShoppingMallSnapshotParty.IUpdate = {
    partyType: body[0].partyType,
    partyId: body[0].partyId,
    canView: body[0].canView,
  };

  const updateB: IShoppingMallSnapshotParty.IUpdate = {
    partyType: body[1].partyType,
    partyId: body[1].partyId,
    canView: body[1].canView,
  };

  // 3) First application
  const resultA = await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
    adminConnection,
    {
      snapshotId: snapshotId satisfies string & tags.Format<"uuid">,
      body: updateA,
    },
  );
  typia.assert(resultA);

  const resultB = await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
    adminConnection,
    {
      snapshotId: snapshotId satisfies string & tags.Format<"uuid">,
      body: updateB,
    },
  );
  typia.assert(resultB);

  // Treat returned value as the summary for the updated party
  const updatedA = resultA as unknown as IShoppingMallSnapshotParty.ISummary;
  const updatedB = resultB as unknown as IShoppingMallSnapshotParty.ISummary;

  TestValidator.predicate(
    "party A relationship exists in response",
    () => updatedA !== undefined,
  );
  TestValidator.predicate(
    "party B relationship exists in response",
    () => updatedB !== undefined,
  );

  TestValidator.equals(
    "party A can_view matches",
    updatedA.can_view,
    updateA.canView,
  );
  TestValidator.equals(
    "party A deleted_at is null",
    updatedA.deleted_at,
    null,
  );

  TestValidator.equals(
    "party B can_view matches",
    updatedB.can_view,
    updateB.canView,
  );
  TestValidator.predicate(
    "party B is active (deleted_at is null)",
    () => updatedB.deleted_at === null,
  );

  // 4) Idempotence: apply same updates again and verify can_view stability
  const resultA2 = await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
    adminConnection,
    {
      snapshotId: snapshotId satisfies string & tags.Format<"uuid">,
      body: updateA,
    },
  );
  typia.assert(resultA2);

  const resultB2 = await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
    adminConnection,
    {
      snapshotId: snapshotId satisfies string & tags.Format<"uuid">,
      body: updateB,
    },
  );
  typia.assert(resultB2);

  const updatedA2 = resultA2 as unknown as IShoppingMallSnapshotParty.ISummary;
  const updatedB2 = resultB2 as unknown as IShoppingMallSnapshotParty.ISummary;

  TestValidator.equals(
    "party A can_view stable",
    updatedA2.can_view,
    updateA.canView,
  );
  TestValidator.equals(
    "party A deleted_at stable (null)",
    updatedA2.deleted_at,
    null,
  );

  TestValidator.equals(
    "party B can_view stable",
    updatedB2.can_view,
    updateB.canView,
  );
  TestValidator.predicate(
    "party B deleted_at is null",
    () => updatedB2.deleted_at === null,
  );
}
