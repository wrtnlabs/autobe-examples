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

export async function test_api_snapshot_lookup_by_code_metadata_only_when_payload_absent(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2) Snapshot code fixture: must be viewable by admin but has no active payload.
  const snapshotCode = "SNAPSHOT_CODE_NO_PAYLOAD";
  // 3) Call PATCH /shoppingMall/admin/snapshots/lookup-by-code
  const output =
    await api.functional.shoppingMall.admin.snapshots.lookup_by_code.lookupByCode(
      adminConnection,
      {
        body: typia.assert<IShoppingMallSnapshot.IRequest>({
          snapshotCode,
        } as any),
      },
    );
  typia.assert(output);
  // 4) Validate metadata-only behavior
  TestValidator.equals(
    "snapshotCode matches",
    output.snapshotCode,
    snapshotCode,
  );
  TestValidator.predicate("has id", output.id.length > 0);
  TestValidator.predicate("has sourceType", output.sourceType.length > 0);
  TestValidator.predicate(
    "has sourceEntityId",
    output.sourceEntityId.length > 0,
  );
  TestValidator.predicate("createdAt present", output.createdAt.length > 0);
  TestValidator.predicate("updatedAt present", output.updatedAt.length > 0);
  TestValidator.predicate("reason present", output.reason.length > 0);
  TestValidator.equals("payload is null when absent", output.payload, null);
}
