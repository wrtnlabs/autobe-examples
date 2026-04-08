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

/**
 * Retrieve a pending administrator approval request and verify its current governance state.
 *
 * Validates the read-only detail endpoint for administrator approval requests by authenticating an administrator, loading a pending request by ID, and confirming the response reflects only the current persisted governance record.
 *
 * The test focuses on the applicant administrator reference, submitted reason, pending status, null review outcome fields, and lifecycle timestamps. It also confirms the request detail is stable across repeated reads and does not imply any snapshot history in the payload.
 *
 * 1. Register and authenticate an administrator account using a dedicated connection.
 * 2. Retrieve a pending administrator approval request by UUID.
 * 3. Validate the current governance record fields.
 * 4. Call the endpoint again and confirm the response remains unchanged.
 */
export async function test_api_administrator_approval_request_pending_detail(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authenticated = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authenticated);
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.mallPlatform.administrator.approvalRequests.at(
      adminConnection,
      {
        approvalRequestId,
      },
    );
  typia.assert(first);
  TestValidator.predicate(
    "applicant administrator summary exists",
    first.administrator !== null && first.administrator !== undefined,
  );
  TestValidator.predicate(
    "submitted reason exists",
    first.reason !== null && first.reason !== undefined,
  );
  TestValidator.equals("request status is pending", first.status, "pending");
  TestValidator.equals(
    "reviewer administrator is null",
    first.reviewerAdministrator,
    null,
  );
  TestValidator.equals("rejection reason is null", first.rejectionReason, null);
  TestValidator.equals("reviewedAt is null", first.reviewedAt, null);
  TestValidator.predicate("createdAt exists", first.createdAt.length > 0);
  TestValidator.predicate("updatedAt exists", first.updatedAt.length > 0);
  TestValidator.equals("deletedAt is null", first.deletedAt, null);
  const second =
    await api.functional.mallPlatform.administrator.approvalRequests.at(
      adminConnection,
      {
        approvalRequestId,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "approval request detail is stable across repeated reads",
    first,
    second,
  );
}
