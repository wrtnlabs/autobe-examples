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

export async function test_api_administrator_approval_request_decision_reject_pending_request(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test rejection handling for an administrator approval request decision.
   *
   * Validates that a super-administrator-authenticated session can submit a rejection decision to the approval request decision endpoint and that the returned request payload reflects the rejected lifecycle state with reviewer and rejection metadata preserved.
   *
   * 1. Create a super-administrator authenticated session.
   * 2. Submit a rejection decision through the approval request decision endpoint.
   * 3. Validate that the returned request is marked rejected and contains reviewer history.
   */
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin =
    await api.functional.mallPlatform.auth.administrator.join(
      superAdminConnection,
      {
        body: {
          email:
            `superadmin_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
              tags.Format<"email">,
          password: "password1234" satisfies string & tags.Format<"password">,
        } satisfies IMallPlatformAdministrator.IJoin,
      },
    );
  typia.assert(superAdminJoin);
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const rejected =
    await generate_random_mall_platform_administrator_approval_requests_decisions_create(
      superAdminConnection,
      {
        params: { approvalRequestId },
        body: {
          reason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(rejected);
  TestValidator.equals(
    "approval request id preserved",
    rejected.id,
    approvalRequestId,
  );
  TestValidator.equals("request reason preserved", rejected.reason, reason);
  TestValidator.equals("request status rejected", rejected.status, "rejected");
  TestValidator.predicate(
    "reviewer administrator is recorded",
    rejected.reviewerAdministrator !== null,
  );
  TestValidator.predicate(
    "rejection reason is recorded or request remains traceable",
    rejected.rejectionReason !== null || rejected.reviewedAt !== null,
  );
}
