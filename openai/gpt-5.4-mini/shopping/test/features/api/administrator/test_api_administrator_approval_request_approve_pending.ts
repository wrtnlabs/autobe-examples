import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_request_approve_pending(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Approve a pending administrator approval request and verify governance record preservation.
   *
   * This test validates the administrator approval workflow for a pending governance request.
   * It focuses on the finalization behavior of the request record after a super administrator
   * approves it, ensuring that the request is marked approved, reviewer metadata is populated,
   * and the record remains available for accountability review.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Submit an approval decision against the administrator approval request endpoint.
   * 3. Verify the resulting request record reflects approval and preserves lifecycle metadata.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const originalReason = RandomGenerator.paragraph({ sentences: 2 });
  const approvalRequest =
    await api.functional.mallPlatform.administrator.approvalRequests.update(
      administratorConnection,
      {
        approvalRequestId,
        body: {
          status: "approved",
          reviewedAt: new Date().toISOString(),
        } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "approval request status",
    approvalRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewer administrator populated",
    approvalRequest.reviewerAdministrator !== null,
  );
  TestValidator.predicate(
    "reviewedAt populated",
    approvalRequest.reviewedAt !== null,
  );
  TestValidator.equals(
    "rejection reason remains null",
    approvalRequest.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "request remains active",
    approvalRequest.deletedAt === null,
  );
  TestValidator.predicate(
    "applicant reference exists",
    approvalRequest.administrator !== null,
  );
  TestValidator.equals(
    "original reason preserved",
    approvalRequest.reason,
    originalReason,
  );
}
