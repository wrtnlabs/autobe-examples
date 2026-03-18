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
import { generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party } from "../../../generate/generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party";
import { prepare_random_shopping_mall_snapshot_party } from "../../../prepare/prepare_random_shopping_mall_snapshot_party";

export async function test_api_snapshot_parties_duplicate_unique_constraint_conflict(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
    },
  });
  // NOTE: Scenario requires an existing snapshotId. This test uses a UUID
  // and expects the backend to accept it in the configured test environment.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const partyType = RandomGenerator.alphabets(6) satisfies string &
    tags.MinLength<1>;
  const partyId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
      adminConnection,
      {
        params: { snapshotId },
        body: {
          partyType,
          partyId,
          canView: true,
        } satisfies IShoppingMallSnapshotParty.ICreate,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "snapshotId matches",
    first.shopping_mall_snapshot_id,
    snapshotId,
  );
  TestValidator.equals("partyType matches", first.party_type, partyType);
  TestValidator.equals("partyId matches", first.party_id, partyId);
  TestValidator.equals("canView matches", first.can_view, true);
  await TestValidator.error("duplicate tuple is rejected", async () => {
    await generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
      adminConnection,
      {
        params: { snapshotId },
        body: {
          partyType,
          partyId,
          canView: false,
        } satisfies IShoppingMallSnapshotParty.ICreate,
      },
    );
  });
  // Repeating again with the same tuple should also be rejected.
  await TestValidator.error("duplicate tuple remains rejected", async () => {
    await generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
      adminConnection,
      {
        params: { snapshotId },
        body: {
          partyType,
          partyId,
          canView: true,
        } satisfies IShoppingMallSnapshotParty.ICreate,
      },
    );
  });
}
