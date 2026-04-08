import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies that a missing cancellation request snapshot is rejected for an administrator.
 *
 * This test authenticates an administrator on a dedicated connection and then
 * requests a cancellation-request snapshot using valid UUID identifiers that are
 * not expected to exist in the targeted order-item and cancellation-request scope.
 * The endpoint must respond with a not-found error, confirming that immutable
 * snapshot lookup is strictly scoped and does not leak unrelated history records.
 *
 * 1. Authenticate an administrator with a dedicated connection.
 * 2. Request a non-existent cancellation request snapshot by scoped identifiers.
 * 3. Assert that the endpoint responds with HTTP 404 Not Found.
 */
export async function test_api_cancellation_request_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator cancellation request snapshot not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.getByOrderitemidAndCancellationrequestidAndSnapshotid(
        adminConnection,
        {
          orderItemId,
          cancellationRequestId,
          snapshotId,
        },
      );
    },
  );
}
