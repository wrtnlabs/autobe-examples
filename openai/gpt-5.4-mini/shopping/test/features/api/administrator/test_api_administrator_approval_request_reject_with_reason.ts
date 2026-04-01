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

export async function test_api_administrator_approval_request_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(admin);
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updated =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.update(
      adminConnection,
      {
        administratorApprovalRequestId: requestId,
        body: {
          status: "rejected",
          rejectionReason,
        } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("request id preserved", updated.id, requestId);
  TestValidator.equals("request status rejected", updated.status, "rejected");
  TestValidator.equals(
    "rejection reason stored",
    updated.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed timestamp recorded",
    updated.reviewedAt !== null,
  );
  TestValidator.predicate(
    "reviewer administrator recorded",
    updated.reviewerAdministrator !== null,
  );
  TestValidator.equals(
    "reviewer account matches authenticated administrator",
    updated.reviewerAdministrator?.id,
    admin.id,
  );
  TestValidator.equals(
    "reviewer email matches authenticated administrator",
    updated.reviewerAdministrator?.email,
    admin.email,
  );
  TestValidator.predicate(
    "applicant remains a non-deleted administrator summary",
    updated.administrator.deletedAt === null,
  );
  TestValidator.predicate(
    "rejected request is finalized",
    updated.status !== "pending",
  );
}
