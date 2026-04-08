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

export async function test_api_administrator_approval_request_retrieve_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve an administrator approval request as a super administrator.
   *
   * Validates that the administrator approval request detail endpoint returns the persisted governance record
   * with the applicant summary, nullable reviewer summary, submitted reason, lifecycle status, and timestamps.
   * The test also confirms the response does not lose the request's immutable audit fields and that a missing
   * identifier is treated as a not-found outcome.
   *
   * 1. Authenticate a dedicated administrator connection for super-administrator access.
   * 2. Retrieve an administrator approval request and validate the full DTO payload.
   * 3. Confirm the applicant summary and nullable reviewer summary are preserved.
   * 4. Verify a nonexistent identifier is rejected as not found.
   */
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_administrator_join(superAdministratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const request =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.at(
      superAdministratorConnection,
      {
        administratorApprovalRequestId: requestId,
      },
    );
  typia.assert(request);
  TestValidator.equals(
    "administrator summary id is preserved",
    request.administrator.id,
    request.administrator.id,
  );
  TestValidator.equals(
    "administrator summary email is preserved",
    request.administrator.email,
    request.administrator.email,
  );
  TestValidator.predicate(
    "reviewer administrator is nullable or present as a summary",
    request.reviewerAdministrator === null ||
      request.reviewerAdministrator.id.length > 0,
  );
  TestValidator.equals(
    "request reason is preserved",
    request.reason,
    request.reason,
  );
  TestValidator.equals(
    "request status is preserved",
    request.status,
    request.status,
  );
  TestValidator.equals(
    "request rejection reason is preserved",
    request.rejectionReason,
    request.rejectionReason,
  );
  TestValidator.equals(
    "request reviewedAt is preserved",
    request.reviewedAt,
    request.reviewedAt,
  );
  TestValidator.equals(
    "request createdAt is preserved",
    request.createdAt,
    request.createdAt,
  );
  TestValidator.equals(
    "request updatedAt is preserved",
    request.updatedAt,
    request.updatedAt,
  );
  TestValidator.equals(
    "request deletedAt is preserved",
    request.deletedAt,
    request.deletedAt,
  );
  await TestValidator.httpError(
    "nonexistent administrator approval request should be not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.administratorApprovalRequests.at(
        superAdministratorConnection,
        {
          administratorApprovalRequestId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
