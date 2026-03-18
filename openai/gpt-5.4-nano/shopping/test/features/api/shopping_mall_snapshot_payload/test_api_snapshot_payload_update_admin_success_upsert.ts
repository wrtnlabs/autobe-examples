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

export async function test_api_snapshot_payload_update_admin_success_upsert(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(adminAuth);
  // SnapshotId must be an existing snapshot that this admin is allowed to manage.
  // No snapshot creation/read utilities were provided in the input materials, so
  // we attempt several random UUIDs to find a usable snapshot in seeded test DB.
  const payloadNew1 = RandomGenerator.paragraph({ sentences: 2 });
  const payloadNew2 = RandomGenerator.paragraph({ sentences: 2 });
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshotId = typia.random<string & tags.Format<"uuid">>();
    const updated1 =
      await api.functional.shoppingMall.admin.snapshots.payloads.updatePayloads(
        adminConnection,
        {
          snapshotId,
          body: {
            payload: payloadNew1,
          } satisfies IShoppingMallSnapshotPayload.IUpdate,
        },
      );
    typia.assert(updated1);
    TestValidator.equals(
      "payload matches first update",
      updated1.payload,
      payloadNew1,
    );
    TestValidator.equals(
      "snapshot id association remains",
      updated1.shopping_mall_snapshot_id,
      snapshotId,
    );
    const updated2 =
      await api.functional.shoppingMall.admin.snapshots.payloads.updatePayloads(
        adminConnection,
        {
          snapshotId,
          body: {
            payload: payloadNew2,
          } satisfies IShoppingMallSnapshotPayload.IUpdate,
        },
      );
    typia.assert(updated2);
    TestValidator.equals(
      "payload matches second update",
      updated2.payload,
      payloadNew2,
    );
    TestValidator.equals(
      "snapshot id association remains",
      updated2.shopping_mall_snapshot_id,
      snapshotId,
    );
    // Success exit.
    return;
  }
  throw new Error(
    "Failed to upsert snapshot payload: could not find a usable seeded snapshot for this admin within retry limit.",
  );
}
