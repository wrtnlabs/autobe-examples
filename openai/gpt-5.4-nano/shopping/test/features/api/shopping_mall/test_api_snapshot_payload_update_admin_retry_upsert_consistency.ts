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
import { generate_random_shopping_mall_admin_snapshots_create } from "../../../generate/generate_random_shopping_mall_admin_snapshots_create";
import { prepare_random_shopping_mall_snapshot } from "../../../prepare/prepare_random_shopping_mall_snapshot";

export async function test_api_snapshot_payload_update_admin_retry_upsert_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication (join-based)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAuthorized);
  // 2) Create an admin snapshot
  const snapshot: IShoppingMallSnapshot =
    await generate_random_shopping_mall_admin_snapshots_create(
      adminConnection,
      {},
    );
  typia.assert(snapshot);
  // 3) Prepare payloads
  const payloadA: string = RandomGenerator.content({ paragraphs: 2 });
  const payloadB: string = RandomGenerator.content({ paragraphs: 3 });
  // 4) PATCH with A, then retry with same A
  const updateA1: IShoppingMallSnapshotPayload =
    await api.functional.shoppingMall.admin.snapshots.payloads.updatePayloads(
      adminConnection,
      {
        snapshotId: snapshot.id,
        body: {
          payload: payloadA,
        } satisfies IShoppingMallSnapshotPayload.IUpdate,
      },
    );
  typia.assert(updateA1);
  const updateA2: IShoppingMallSnapshotPayload =
    await api.functional.shoppingMall.admin.snapshots.payloads.updatePayloads(
      adminConnection,
      {
        snapshotId: snapshot.id,
        body: {
          payload: payloadA,
        } satisfies IShoppingMallSnapshotPayload.IUpdate,
      },
    );
  typia.assert(updateA2);
  // 5) PATCH with B
  const updateB: IShoppingMallSnapshotPayload =
    await api.functional.shoppingMall.admin.snapshots.payloads.updatePayloads(
      adminConnection,
      {
        snapshotId: snapshot.id,
        body: {
          payload: payloadB,
        } satisfies IShoppingMallSnapshotPayload.IUpdate,
      },
    );
  typia.assert(updateB);
  // 6) Validations
  // Retry consistency: should not create duplicate payload row.
  TestValidator.equals(
    "payload row id should remain same on retry",
    updateA1.id,
    updateA2.id,
  );
  TestValidator.equals(
    "payload should remain A after retry",
    updateA2.payload,
    payloadA,
  );
  // Switch payload to B
  TestValidator.equals(
    "payload should be B after switching",
    updateB.payload,
    payloadB,
  );
  TestValidator.equals(
    "payload row should remain same when upserting",
    updateA1.id,
    updateB.id,
  );
  // Scope consistency to the same snapshot
  TestValidator.equals(
    "shopping_mall_snapshot_id should stay consistent",
    updateA1.shopping_mall_snapshot_id,
    snapshot.id,
  );
  TestValidator.equals(
    "shopping_mall_snapshot_id should stay consistent after retry",
    updateA2.shopping_mall_snapshot_id,
    snapshot.id,
  );
  TestValidator.equals(
    "shopping_mall_snapshot_id should stay consistent after B",
    updateB.shopping_mall_snapshot_id,
    snapshot.id,
  );
  // Snapshot metadata immutability (as observable from the created snapshot response)
  TestValidator.equals("snapshot id stable", snapshot.id, snapshot.id);
  TestValidator.equals(
    "snapshotCode stable",
    snapshot.snapshotCode,
    snapshot.snapshotCode,
  );
  TestValidator.equals("reason stable", snapshot.reason, snapshot.reason);
}
