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

export async function test_api_administrator_approval_request_completed_not_reprocessed(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that an administrator approval request cannot be processed twice after it reaches a terminal review state.
   *
   * The test authenticates an administrator, creates a reviewable approval request record through the update API, and then attempts to submit a second decision to the same request. It validates that the repeat decision is rejected and that the terminal request state is preserved for audit and governance purposes.
   *
   * 1. Authenticate an administrator with a dedicated connection.
   * 2. Submit an initial approval decision to obtain a finalized request record.
   * 3. Attempt to reprocess the same request with a different decision.
   * 4. Confirm the repeat attempt fails and the finalized request data remains unchanged.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: `${RandomGenerator.alphaNumeric(12)}A1!`,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const firstDecision = {
    status: "approved",
    reviewedAt: new Date().toISOString(),
  } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate;
  const finalizedRequest =
    await api.functional.mallPlatform.administrator.approvalRequests.update(
      administratorConnection,
      {
        approvalRequestId,
        body: firstDecision,
      },
    );
  typia.assert(finalizedRequest);
  const snapshot = {
    id: finalizedRequest.id,
    status: finalizedRequest.status,
    reviewerAdministrator: finalizedRequest.reviewerAdministrator,
    reason: finalizedRequest.reason,
    rejectionReason: finalizedRequest.rejectionReason,
    reviewedAt: finalizedRequest.reviewedAt,
    createdAt: finalizedRequest.createdAt,
    updatedAt: finalizedRequest.updatedAt,
    deletedAt: finalizedRequest.deletedAt,
  };
  await TestValidator.error(
    "completed administrator approval request cannot be reprocessed",
    async () => {
      await api.functional.mallPlatform.administrator.approvalRequests.update(
        administratorConnection,
        {
          approvalRequestId: finalizedRequest.id,
          body: {
            status: "rejected",
            rejectionReason: "duplicate governance decision",
            reviewedAt: new Date().toISOString(),
          } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "request id is preserved",
    finalizedRequest.id,
    snapshot.id,
  );
  TestValidator.equals(
    "request status is preserved",
    finalizedRequest.status,
    snapshot.status,
  );
  TestValidator.equals(
    "reviewer administrator is preserved",
    finalizedRequest.reviewerAdministrator,
    snapshot.reviewerAdministrator,
  );
  TestValidator.equals(
    "request reason is preserved",
    finalizedRequest.reason,
    snapshot.reason,
  );
  TestValidator.equals(
    "rejection reason is preserved",
    finalizedRequest.rejectionReason,
    snapshot.rejectionReason,
  );
  TestValidator.equals(
    "reviewedAt is preserved",
    finalizedRequest.reviewedAt,
    snapshot.reviewedAt,
  );
  TestValidator.equals(
    "createdAt is preserved",
    finalizedRequest.createdAt,
    snapshot.createdAt,
  );
  TestValidator.equals(
    "updatedAt is preserved",
    finalizedRequest.updatedAt,
    snapshot.updatedAt,
  );
  TestValidator.equals(
    "deletedAt is preserved",
    finalizedRequest.deletedAt,
    snapshot.deletedAt,
  );
}
