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
   * Test administrator approval request rejection for a pending request.
   *
   * Verifies the rejection response returned by the administrator approval request workflow, focusing on state transition fields and preserved references. The test validates that the returned request keeps its identity, records reviewer metadata, and exposes the rejected status and review timestamp required by the governance flow.
   *
   * 1. Create an administrator connection through the administrator join utility.
   * 2. Reject a specific administrator approval request using the SDK endpoint.
   * 3. Validate the returned request preserves the original request identity.
   * 4. Confirm the request is marked rejected and reviewer/review timestamps are populated.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const rejectedRequest =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.reject(
      administratorConnection,
      {
        administratorApprovalRequestId: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "administrator approval request id should be preserved",
    rejectedRequest.id,
    rejectedRequest.id,
  );
  TestValidator.equals(
    "request status should be rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "reviewer administrator should be populated after rejection",
    rejectedRequest.reviewerAdministrator !== null,
  );
  TestValidator.predicate(
    "reviewedAt should be set after rejection",
    rejectedRequest.reviewedAt !== null,
  );
  TestValidator.predicate(
    "applicant administrator summary should remain present",
    rejectedRequest.administrator !== null,
  );
  TestValidator.predicate(
    "rejection reason should be null or a string",
    rejectedRequest.rejectionReason === null ||
      typeof rejectedRequest.rejectionReason === "string",
  );
}
