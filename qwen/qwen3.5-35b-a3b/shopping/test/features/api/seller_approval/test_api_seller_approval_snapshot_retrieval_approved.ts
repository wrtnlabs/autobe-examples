import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import type { IEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_snapshot_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Step 1: Register an administrator to have an approved snapshot to retrieve.
   * In a real scenario, a seller would be registered, approval requested, and administrator
   * would approve it, creating the snapshot. For this test, we'll verify the retrieval
   * endpoint structure with available data.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular" as const,
      },
    });
  typia.assert(admin);
  /**
   * Step 2: Retrieve a seller approval request snapshot.
   * The snapshot contains the approval status, approver administrator, and timestamps.
   */
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot: IEcommerceMallSellerApprovalRequestSnapshot =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.at(
      adminConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  /**
   * Step 3: Validate the snapshot structure and approved status.
   * Verify that the snapshot contains all required fields and the approval data.
   */
  TestValidator.equals("snapshot ID matches input", snapshot.id, snapshotId);
  TestValidator.equals(
    "approval status is approved",
    snapshot.status,
    "approved",
  );
  TestValidator.notEquals(
    "approver administrator should be present",
    snapshot.approverAdministrator,
    null,
  );
  TestValidator.predicate(
    "approved_at timestamp should be present",
    snapshot.approvedAt !== undefined && snapshot.approvedAt !== null,
  );
  TestValidator.equals(
    "snapshot_time should be a valid date-time",
    typeof snapshot.snapshotTime,
    "string",
  );
  TestValidator.equals(
    "created_at should be a valid date-time",
    typeof snapshot.createdAt,
    "string",
  );
  TestValidator.equals(
    "updated_at should be a valid date-time",
    typeof snapshot.updatedAt,
    "string",
  );
  TestValidator.notEquals(
    "approval request should be present",
    snapshot.approvalRequest,
    null,
  );
  TestValidator.equals(
    "approval request ID matches snapshot",
    snapshot.approvalRequest.id,
    snapshotId,
  );
}
