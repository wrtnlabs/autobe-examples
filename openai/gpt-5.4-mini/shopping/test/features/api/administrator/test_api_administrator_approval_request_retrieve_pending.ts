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

export async function test_api_administrator_approval_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve an administrator approval request by UUID.
   *
   * This test exercises the governance read endpoint for administrator approval requests and
   * validates the returned record shape for a pending request representation. It focuses on the
   * read-only response contract: applicant reference, reason, workflow status, nullable reviewer
   * fields, and lifecycle timestamps.
   *
   * 1. Create an authenticated administrator session.
   * 2. Retrieve an approval request using a UUID path parameter.
   * 3. Verify the response fields that must be present on the approval request resource.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(admin);
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const request =
    await api.functional.mallPlatform.administrator.approval_requests.at(
      adminConnection,
      {
        approvalRequestId,
      },
    );
  typia.assert(request);
  TestValidator.equals("approval request id", request.id, approvalRequestId);
  TestValidator.predicate(
    "applicant administrator summary is returned",
    request.administrator !== null && request.administrator !== undefined,
  );
  TestValidator.predicate("reason is returned", request.reason.length > 0);
  TestValidator.predicate(
    "status is a non-empty workflow state",
    request.status.length > 0,
  );
  TestValidator.equals(
    "reviewer administrator is null for pending requests",
    request.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "rejection reason is null for pending requests",
    request.rejectionReason,
    null,
  );
  TestValidator.equals(
    "reviewedAt is null for pending requests",
    request.reviewedAt,
    null,
  );
  TestValidator.predicate(
    "createdAt timestamp exists",
    request.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    request.updatedAt.length > 0,
  );
}
