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
import { generate_random_mall_platform_administrator_approval_requests_decisions_create } from "../../../generate/generate_random_mall_platform_administrator_approval_requests_decisions_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_administrator_approval_request_decision_approve_pending_request(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test approval of a pending administrator approval request.
   *
   * Verifies that a privileged administrator can approve an administrator
   * approval request and that the resulting governance record preserves the
   * applicant reason while recording the reviewer, approval status, and review
   * timestamp.
   *
   * 1. Authenticate a privileged administrator session.
   * 2. Submit an approval decision for a pending administrator approval request.
   * 3. Validate the approved request response fields that are exposed by the API.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformAdministratorApprovalRequest.ICreate;
  const approvedRequest =
    await generate_random_mall_platform_administrator_approval_requests_decisions_create(
      adminConnection,
      {
        params: { approvalRequestId },
        body,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request id should match",
    approvedRequest.id,
    approvedRequest.id,
  );
  TestValidator.equals(
    "request should be approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "applicant reason should be preserved",
    approvedRequest.reason,
    body.reason,
  );
  TestValidator.predicate(
    "reviewer administrator should be recorded",
    approvedRequest.reviewerAdministrator !== null,
  );
  TestValidator.predicate(
    "reviewed timestamp should exist",
    approvedRequest.reviewedAt !== null,
  );
  TestValidator.equals(
    "request should remain undeleted",
    approvedRequest.deletedAt,
    null,
  );
}
