import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_request_search(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator approval request search browsing for governance triage.
   *
   * Validates that an authenticated administrator can access the approval request search endpoint
   * and receive a paginated summary page appropriate for super-administrator review workflows.
   * The test checks that the response contains summary records with applicant and reviewer
   * administrator information, reason text, status, rejection details, review timestamps, and
   * lifecycle timestamps.
   *
   * 1. Register and authenticate an administrator using an isolated actor connection.
   * 2. Query administrator approval requests with pagination controls.
   * 3. Validate the page metadata and summary record projection returned by the endpoint.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination should be returned",
    output.pagination.current >= 1 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response should contain summary records",
    Array.isArray(output.data),
  );
  for (const summary of output.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "summary should include applicant administrator summary",
      summary.administrator.id.length > 0 &&
        summary.administrator.email.length > 0,
    );
    TestValidator.predicate(
      "summary should preserve reviewer administrator as nullable summary",
      summary.reviewerAdministrator === null ||
        (summary.reviewerAdministrator.id.length > 0 &&
          summary.reviewerAdministrator.email.length > 0),
    );
    TestValidator.predicate(
      "summary should expose request lifecycle and review fields",
      summary.reason.length > 0 &&
        summary.status.length > 0 &&
        summary.createdAt.length > 0 &&
        summary.updatedAt.length > 0 &&
        (summary.rejectionReason === null ||
          summary.rejectionReason.length >= 0) &&
        (summary.reviewedAt === null || summary.reviewedAt.length > 0) &&
        (summary.deletedAt === null || summary.deletedAt.length > 0),
    );
  }
}
