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
 * Rejects cancellation request snapshot lookups that do not match the declared order-item hierarchy.
 *
 * Verifies that an authenticated administrator cannot retrieve a cancellation request snapshot when the order item, cancellation request, and snapshot identifiers do not belong to the same parent-child chain. This protects dispute-review history from cross-record leakage and ensures the endpoint returns not found for unrelated historical data.
 *
 * 1. Authenticate as an administrator using a fresh actor-specific connection.
 * 2. Call the snapshot endpoint with valid but unrelated UUID identifiers.
 * 3. Confirm the API responds with 404 instead of exposing another request's snapshot.
 */
export async function test_api_cancellation_request_snapshot_hierarchy_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cancellation request snapshot hierarchy mismatch should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.at(
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
