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
   * Approves an administrator approval request and verifies the persisted decision record.
   *
   * This test validates the governance workflow for administrator onboarding approval.
   * It authenticates a reviewer administrator, submits an approval decision against a request
   * identifier, and verifies that the returned request record reflects the approved state while
   * preserving the applicant's original reason and capturing review metadata.
   *
   * The scenario focuses on the resource properties exposed by the approval request DTO and
   * avoids assuming unavailable APIs for applicant-account verification or request creation.
   */
  const reviewerConnection: api.IConnection = { host: connection.host };
  const reviewer = await authorize_administrator_join(reviewerConnection, {
    body: {
      email: `reviewer_${RandomGenerator.alphabets(8)}@test.com`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(8)}`,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(reviewer);
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const reviewedAt = new Date().toISOString();
  const approval =
    await api.functional.mallPlatform.administrator.approvalRequests.update(
      reviewerConnection,
      {
        approvalRequestId,
        body: {
          status: "approved",
          reviewedAt,
          reviewerAdministratorId: reviewer.id,
        } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
      },
    );
  typia.assert(approval);
  TestValidator.equals(
    "approval request id should match the target",
    approval.id,
    approvalRequestId,
  );
  TestValidator.equals(
    "approval request should be approved",
    approval.status,
    "approved",
  );
  TestValidator.predicate(
    "applicant reason should be preserved",
    approval.reason.length > 0,
  );
  TestValidator.equals(
    "reviewer administrator should be recorded",
    approval.reviewerAdministrator?.id,
    reviewer.id,
  );
  TestValidator.equals(
    "review timestamp should be persisted",
    approval.reviewedAt,
    reviewedAt,
  );
  TestValidator.equals(
    "approved request should remain available as governance history",
    approval.deletedAt,
    null,
  );
  TestValidator.equals(
    "reviewer email should be preserved",
    approval.reviewerAdministrator?.email,
    reviewer.email,
  );
}
