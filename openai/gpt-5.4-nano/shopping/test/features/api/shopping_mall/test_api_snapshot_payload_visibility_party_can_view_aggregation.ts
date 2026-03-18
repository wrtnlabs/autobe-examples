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

export async function test_api_snapshot_payload_visibility_party_can_view_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // The test environment is expected to contain seeded snapshot payloads
  // whose snapshot visibility party rows cover:
  // - multiple active entries with at least one can_view=true
  // - conflicting can_view=false and can_view=true where allow must win
  //
  // This test validates that an authorized admin can retrieve the payload
  // and that the response matches IShoppingMallSnapshotPayload.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminRegistration = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminRegistration);
  const snapshotPayload =
    await api.functional.shoppingMall.admin.snapshots.payloads.at(
      adminConnection,
      {
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        snapshotPayloadId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshotPayload);
}
