import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_snapshot_view_authorized_with_payload(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin join / authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinPayload,
  });
  typia.assert(adminAuth);
  // Keep admin identity for party visibility matching
  const adminPartyId = adminAuth.id;
  // 2) Snapshot ID
  // No snapshot discovery utilities are provided in the inputs; use a UUID.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3) Act
  const snapshot = await api.functional.shoppingMall.admin.snapshots.at(
    adminConnection,
    { snapshotId },
  );
  typia.assert(snapshot);
  // 4) Assert: metadata
  TestValidator.equals("snapshot id matches request", snapshot.id, snapshotId);
  TestValidator.equals("snapshot deletedAt is null", snapshot.deletedAt, null);
  TestValidator.predicate(
    "snapshot parties should be a non-empty array",
    snapshot.parties.length > 0,
  );
  // 5) Assert: payload
  TestValidator.predicate("snapshot payload exists", snapshot.payload !== null);
  const payload = typia.assert(snapshot.payload!);
  typia.assert(payload);
  TestValidator.equals(
    "payload shopping_mall_snapshot_id matches snapshot.id",
    payload.shopping_mall_snapshot_id,
    snapshot.id,
  );
  TestValidator.equals("payload deleted_at is null", payload.deleted_at, null);
  // 6) Assert: visibility parties include the admin entry and can_view=true
  const selfVisibility = snapshot.parties.find(
    (p) =>
      p.party_id === adminPartyId &&
      p.can_view === true &&
      p.deleted_at === null,
  );
  TestValidator.predicate(
    "includes authorized admin visibility entry",
    selfVisibility !== undefined,
  );
}
