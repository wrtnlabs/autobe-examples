import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_snapshot_admin_view_seller_response_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Use pre-seeded snapshot IDs (random UUIDs for test simulation)
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the cancellation request snapshot
  const snapshot =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.at(
      adminConnection,
      {
        cancellationRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate business logic - snapshot captures a state transition
  TestValidator.predicate(
    "status transition captured",
    snapshot.statusBefore !== snapshot.statusAfter,
  );
  // 5. Validate ID consistency between request and response
  TestValidator.equals(
    "cancellation request ID matches",
    snapshot.cancellationRequestId,
    cancellationRequestId,
  );
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
}
