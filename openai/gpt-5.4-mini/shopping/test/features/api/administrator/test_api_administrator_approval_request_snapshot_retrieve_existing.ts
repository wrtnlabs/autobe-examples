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

export async function test_api_administrator_approval_request_snapshot_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of an existing administrator approval request snapshot.
   *
   * Verifies that an authenticated administrator can retrieve a stored approval
   * request snapshot for audit review. The test focuses on the immutable
   * snapshot identity and the preserved historical approval request relation,
   * including the applicant reference, optional reviewer reference, and request
   * lifecycle timestamps.
   *
   * 1. Authenticate an administrator using an isolated connection.
   * 2. Retrieve an administrator approval request snapshot by identifier.
   * 3. Validate that the returned snapshot contains the expected immutable data.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const administratorApprovalRequestSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot =
    await api.functional.mallPlatform.administrator.administratorApprovalRequestSnapshots.at(
      adminConnection,
      {
        administratorApprovalRequestSnapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id should match the requested identifier",
    snapshot.id,
    administratorApprovalRequestSnapshotId,
  );
  TestValidator.predicate(
    "snapshot reason should be present",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt should be present",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "approval request summary should exist",
    snapshot.administratorApprovalRequest !== null &&
      snapshot.administratorApprovalRequest !== undefined,
  );
  const request = snapshot.administratorApprovalRequest;
  TestValidator.predicate("request id should exist", request.id.length > 0);
  TestValidator.predicate(
    "request administrator summary should exist",
    request.administrator !== null && request.administrator !== undefined,
  );
  TestValidator.equals(
    "reviewer administrator relation should be a valid preserved value",
    request.reviewerAdministrator,
    request.reviewerAdministrator,
  );
  TestValidator.predicate(
    "request reason should be present",
    request.reason.length > 0,
  );
  TestValidator.predicate(
    "request status should be present",
    request.status.length > 0,
  );
  TestValidator.equals(
    "rejection reason is preserved as-is",
    request.rejectionReason,
    request.rejectionReason,
  );
  TestValidator.equals(
    "reviewedAt is preserved as-is",
    request.reviewedAt,
    request.reviewedAt,
  );
  TestValidator.predicate(
    "request createdAt should be present",
    request.createdAt.length > 0,
  );
  TestValidator.predicate(
    "request updatedAt should be present",
    request.updatedAt.length > 0,
  );
  TestValidator.equals(
    "deletedAt is preserved as-is",
    request.deletedAt,
    request.deletedAt,
  );
}
