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

export async function test_api_administrator_approval_request_approve(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const actingAdministratorId = authorized.id;
  const actingAdministratorEmail = authorized.email;
  const actingAdministratorGrade = authorized.grade;
  const decisionResponse =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.decision(
      administratorConnection,
      {
        administratorApprovalRequestId: requestId,
        body: {
          decision: "approve",
        } satisfies IMallPlatformAdministratorApprovalRequest.IDecision,
      },
    );
  typia.assert(decisionResponse);
  TestValidator.equals(
    "approval request id should be preserved",
    decisionResponse.id,
    requestId,
  );
  TestValidator.equals(
    "approval request should be approved",
    decisionResponse.status,
    "approved",
  );
  TestValidator.equals(
    "rejection reason should be cleared",
    decisionResponse.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "reviewedAt should be set",
    decisionResponse.reviewedAt !== null,
  );
  TestValidator.predicate(
    "reviewer administrator should be populated",
    decisionResponse.reviewerAdministrator !== null,
  );
  TestValidator.equals(
    "original reason should be preserved as a non-empty string",
    typeof decisionResponse.reason,
    "string",
  );
  TestValidator.notEquals(
    "approved request should no longer be pending",
    decisionResponse.status,
    "pending",
  );
  TestValidator.notEquals(
    "approved request should not be rejected",
    decisionResponse.status,
    "rejected",
  );
  TestValidator.notEquals(
    "acting administrator should not be promoted to super administrator by approving a request",
    actingAdministratorGrade,
    "super_administrator",
  );
  TestValidator.equals(
    "acting administrator identity should remain intact",
    decisionResponse.reviewerAdministrator?.id ?? actingAdministratorId,
    actingAdministratorId,
  );
  TestValidator.equals(
    "acting administrator email should remain intact",
    decisionResponse.reviewerAdministrator?.email ?? actingAdministratorEmail,
    actingAdministratorEmail,
  );
}
