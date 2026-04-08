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

export async function test_api_seller_approval_snapshot_retrieval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  // 2. Create random snapshot ID for testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve snapshot
  const snapshot =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.at(
      adminConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot contains rejection data
  TestValidator.equals(
    "snapshot status is rejected",
    snapshot.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejection reason is present",
    snapshot.rejectionReason !== null && snapshot.rejectionReason !== undefined,
  );
  TestValidator.predicate(
    "rejected at timestamp is present",
    snapshot.rejectedAt !== null && snapshot.rejectedAt !== undefined,
  );
  TestValidator.predicate(
    "snapshot time is present",
    snapshot.snapshotTime !== null && snapshot.snapshotTime !== undefined,
  );
  TestValidator.predicate(
    "created at timestamp is present",
    snapshot.createdAt !== null && snapshot.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp is present",
    snapshot.updatedAt !== null && snapshot.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "approval request reference exists",
    snapshot.approvalRequest !== null && snapshot.approvalRequest !== undefined,
  );
  TestValidator.predicate(
    "reviewer administrator exists",
    snapshot.approverAdministrator !== null &&
      snapshot.approverAdministrator !== undefined,
  );
  // 5. Validate reviewer details
  const reviewer = snapshot.approverAdministrator!;
  TestValidator.predicate("reviewer has ID", reviewer.id.length > 0);
  TestValidator.predicate("reviewer has email", reviewer.email.length > 0);
  TestValidator.predicate(
    "reviewer has display name",
    reviewer.displayName.length > 0,
  );
  // 6. Validate approval request details
  const approvalRequest = snapshot.approvalRequest;
  typia.assert(approvalRequest);
  TestValidator.predicate(
    "approval request has ID",
    approvalRequest.id.length > 0,
  );
  TestValidator.predicate(
    "approval request seller exists",
    approvalRequest.seller !== null && approvalRequest.seller !== undefined,
  );
  // 7. Validate seller details
  const seller = approvalRequest.seller;
  typia.assert(seller);
  TestValidator.predicate("seller has ID", seller.id.length > 0);
  TestValidator.predicate(
    "seller has display name",
    seller.display_name.length > 0,
  );
  TestValidator.equals(
    "seller status is rejected",
    seller.approval_status,
    "rejected",
  );
  TestValidator.predicate(
    "seller has rejection reason",
    seller.rejection_reason !== null && seller.rejection_reason !== undefined,
  );
}
