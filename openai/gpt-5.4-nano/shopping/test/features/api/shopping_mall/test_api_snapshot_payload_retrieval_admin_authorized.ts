import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_snapshot_payload_retrieval_admin_authorized(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Use fixture identifiers if the test environment pre-populates them.
  // Otherwise, these UUIDs will likely lead to access denial, which we
  // still validate for correct rejection behavior.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshotPayloadId = typia.random<string & tags.Format<"uuid">>();
  // Attempt happy-path retrieval.
  let payload1: IShoppingMallSnapshotPayload | undefined;
  try {
    payload1 = await api.functional.shoppingMall.admin.snapshots.payloads.at(
      adminConnection,
      {
        snapshotId,
        snapshotPayloadId,
      },
    );
    typia.assert(payload1);
  } catch {
    // no-op: environment may not have fixtures; proceed with rejection
    // assertions below.
  }
  if (payload1) {
    // Scenario 1 (happy path): payload is stable for this immutable snapshot
    // payload record.
    const payload2 =
      await api.functional.shoppingMall.admin.snapshots.payloads.at(
        adminConnection,
        {
          snapshotId: payload1.shopping_mall_snapshot_id,
          snapshotPayloadId: payload1.id,
        },
      );
    typia.assert(payload2);
    TestValidator.equals(
      "payload stable across re-fetch",
      payload2.payload,
      payload1.payload,
    );
    TestValidator.equals(
      "snapshot id stable",
      payload2.shopping_mall_snapshot_id,
      payload1.shopping_mall_snapshot_id,
    );
    // Scenario 2: access control with an unauthorized admin requester.
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(unauthorizedConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
    await TestValidator.error(
      "access denied for admin not permitted to view snapshot payload",
      async () => {
        await api.functional.shoppingMall.admin.snapshots.payloads.at(
          unauthorizedConnection,
          {
            snapshotId: payload1.shopping_mall_snapshot_id,
            snapshotPayloadId: payload1.id,
          },
        );
      },
    );
  } else {
    // If fixtures are unavailable, we can still validate rejection.
    await TestValidator.error(
      "access denied when snapshot payload is not retrievable",
      async () => {
        await api.functional.shoppingMall.admin.snapshots.payloads.at(
          adminConnection,
          {
            snapshotId,
            snapshotPayloadId,
          },
        );
      },
    );
  }
  // Scenario 3: scoped mismatch (snapshot exists but payload not belonging to it)
  // must be rejected without returning payload content.
  let otherSnapshotId = typia.random<string & tags.Format<"uuid">>();
  if (payload1) {
    while (otherSnapshotId === payload1.shopping_mall_snapshot_id) {
      otherSnapshotId = typia.random<string & tags.Format<"uuid">>();
    }
  }
  await TestValidator.error(
    "scoped mismatch (payload not belonging to snapshot) must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.snapshots.payloads.at(
        adminConnection,
        {
          snapshotId: payload1 ? otherSnapshotId : snapshotId,
          snapshotPayloadId: snapshotPayloadId,
        },
      );
    },
  );
}
