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
 * Retrieves an immutable administrator-visible cancellation request snapshot.
 *
 * This test authenticates an administrator through the dedicated join utility,
 * then calls the scoped snapshot lookup endpoint using valid UUID identifiers.
 * It validates that the response matches the immutable snapshot DTO returned by
 * the API and that the preserved historical fields needed for dispute review are
 * present in the payload.
 *
 * The test focuses on the snapshot contract itself rather than live-state
 * mutation, because the endpoint is read-only and the available DTOs expose the
 * immutable snapshot record plus the nested cancellation request summary only as
 * a summary object.
 *
 * 1. Authenticate as an administrator on an isolated connection.
 * 2. Retrieve a cancellation-request snapshot using scoped UUID identifiers.
 * 3. Validate the immutable snapshot response structure with typia.
 */
export async function test_api_cancellation_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const response =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.getByOrderitemidAndCancellationrequestidAndSnapshotid(
      adminConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "snapshot should contain a nested cancellation request summary",
    response.cancellationRequest !== null &&
      response.cancellationRequest !== undefined,
  );
  TestValidator.predicate(
    "snapshot status should be preserved",
    response.snapshotStatus.length > 0,
  );
  TestValidator.predicate(
    "snapshot reason field should be preserved as nullable historical data",
    response.reason === null || response.reason.length > 0,
  );
  TestValidator.predicate(
    "snapshot review result field should be preserved as nullable historical data",
    response.reviewResult === null || response.reviewResult.length > 0,
  );
}
