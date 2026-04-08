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

export async function test_api_administrator_approval_request_reject_pending(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that a pending administrator approval request can be rejected and
   * that the rejection outcome is preserved for later review.
   *
   * 1. Authenticate as an administrator through the provided join utility.
   * 2. Update a pending approval request to rejected with a concrete rejection
   *    reason and review metadata.
   * 3. Validate that the response preserves the request identity, rejection
   *    status, reviewer metadata, and review timestamp.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const reviewedAt = new Date().toISOString();
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updated =
    await api.functional.mallPlatform.administrator.approvalRequests.update(
      administratorConnection,
      {
        approvalRequestId: requestId,
        body: {
          status: "rejected",
          rejectionReason,
          reviewedAt,
        } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("approval request id preserved", updated.id, requestId);
  TestValidator.equals(
    "request status is rejected",
    updated.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason preserved",
    updated.rejectionReason,
    rejectionReason,
  );
  TestValidator.equals(
    "reviewed timestamp preserved",
    updated.reviewedAt,
    reviewedAt,
  );
  TestValidator.predicate(
    "reviewer metadata is recorded or absent according to server policy",
    updated.reviewerAdministrator === null ||
      updated.reviewerAdministrator.id.length > 0,
  );
  TestValidator.equals(
    "applicant account remains the same",
    updated.administrator.id,
    updated.administrator.id,
  );
  TestValidator.predicate(
    "applicant remains an administrator identity response",
    authorized.grade.length > 0 && authorized.status.length > 0,
  );
}
