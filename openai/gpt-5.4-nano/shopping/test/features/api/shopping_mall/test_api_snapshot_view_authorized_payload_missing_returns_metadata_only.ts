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

export async function test_api_snapshot_view_authorized_payload_missing_returns_metadata_only(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.shoppingMall.admin.snapshots.at(
    adminConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  TestValidator.equals(
    "payload should be null when payload record is missing",
    snapshot.payload,
    null,
  );
  TestValidator.predicate(
    "parties array should be present",
    Array.isArray(snapshot.parties),
  );
  // Metadata fields should still be present as defined by the DTO.
  TestValidator.equals(
    "snapshot_code exists",
    typeof snapshot.snapshotCode,
    "string",
  );
  TestValidator.equals(
    "source_type exists",
    typeof snapshot.sourceType,
    "string",
  );
  TestValidator.equals("reason exists", typeof snapshot.reason, "string");
  TestValidator.predicate(
    "timestamps are non-empty strings",
    snapshot.createdAt.length > 0 && snapshot.updatedAt.length > 0,
  );
}
