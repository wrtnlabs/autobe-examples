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

export async function test_api_cancellation_request_snapshot_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies administrator cancellation request snapshot retrieval is isolated by
   * parent scope.
   *
   * This test ensures that the snapshot endpoint does not expose immutable
   * cancellation history when the requested snapshot identifier is paired with
   * the wrong order item or cancellation request scope. A valid-looking UUID is
   * used for the snapshot identifier, but the parent identifiers are unrelated
   * to that snapshot context.
   *
   * 1. Authenticate as an administrator using the join utility.
   * 2. Generate unrelated order item, cancellation request, and snapshot IDs.
   * 3. Request the snapshot through the administrator endpoint.
   * 4. Assert that the request fails with not found.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator snapshot retrieval should reject mismatched parent scope",
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
