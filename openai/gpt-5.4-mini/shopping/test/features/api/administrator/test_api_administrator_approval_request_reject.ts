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

export async function test_api_administrator_approval_request_reject(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministrator = await authorize_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(superAdministrator);
  const applicantReason = RandomGenerator.paragraph({ sentences: 3 });
  const applicantRequest =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.decision(
      superAdministratorConnection,
      {
        administratorApprovalRequestId: typia.random<
          string & tags.Format<"uuid">
        >(),
        body: {
          decision: "reject",
          rejectionReason: applicantReason,
        } satisfies IMallPlatformAdministratorApprovalRequest.IDecision,
      },
    );
  typia.assert(applicantRequest);
  TestValidator.equals(
    "request status should be rejected",
    applicantRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason should be persisted",
    applicantRequest.rejectionReason,
    applicantReason,
  );
  TestValidator.predicate(
    "reviewedAt should be populated",
    applicantRequest.reviewedAt !== null,
  );
  TestValidator.predicate(
    "reviewer administrator should be populated",
    applicantRequest.reviewerAdministrator !== null,
  );
  TestValidator.predicate(
    "original applicant reason should remain intact",
    applicantRequest.reason.length > 0,
  );
  TestValidator.notEquals(
    "reviewer should differ from applicant when review is recorded",
    applicantRequest.reviewerAdministrator?.id,
    applicantRequest.administrator.id,
  );
}
