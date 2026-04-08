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
  /**
   * Reject an administrator approval request with reason and verify the response contract.
   *
   * This test validates the administrator review endpoint for a rejected approval
   * request. It confirms that a privileged administrator session can issue the update
   * call with a rejection payload and that the response preserves the rejection state
   * fields returned by the API.
   *
   * 1. Authenticate an administrator reviewer session.
   * 2. Submit a rejection update payload to the administrator approval request endpoint.
   * 3. Validate the response contains the rejected status and rejection reason fields.
   */
  const reviewerConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(reviewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.update(
      reviewerConnection,
      {
        administratorApprovalRequestId: requestId,
        body: {
          status: "rejected",
          rejectionReason,
          reviewedAt: new Date().toISOString(),
        } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals("request id should match", output.id, requestId);
  TestValidator.equals("status should be rejected", output.status, "rejected");
  TestValidator.equals(
    "rejection reason should be preserved",
    output.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed timestamp should be present",
    output.reviewedAt !== null,
  );
  TestValidator.predicate(
    "reviewer administrator should be present when returned",
    output.reviewerAdministrator !== null,
  );
}
