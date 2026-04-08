import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_request_snapshot_retrieve(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator approval request snapshot retrieval.
   *
   * Verifies that an authenticated administrator can call the historical
   * snapshot retrieval endpoint for an administrator approval request and
   * receive a fully typed immutable snapshot payload.
   *
   * 1. Authenticate a dedicated administrator connection.
   * 2. Request a snapshot using UUID-scoped administrator approval request and snapshot identifiers.
   * 3. Validate the returned snapshot structure, including the nested parent request summary and audit timestamps.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const administratorApprovalRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.snapshots.getByAdministratorapprovalrequestidAndSnapshotid(
      administratorConnection,
      {
        administratorApprovalRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id should match the requested snapshot UUID",
    snapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "snapshot parent request id should match the requested approval request UUID",
    snapshot.administratorApprovalRequestId,
    administratorApprovalRequestId,
  );
  TestValidator.equals(
    "snapshot parent summary id should match the parent request UUID",
    snapshot.administratorApprovalRequest.id,
    administratorApprovalRequestId,
  );
  TestValidator.predicate(
    "snapshot reason should not be empty",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt should be a non-empty ISO datetime string",
    snapshot.createdAt.length > 0,
  );
}
