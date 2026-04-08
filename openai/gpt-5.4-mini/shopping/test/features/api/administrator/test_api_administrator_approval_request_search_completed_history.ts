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

export async function test_api_administrator_approval_request_search_completed_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator approval request search for completed history records.
   *
   * Verifies that the administrator approval-request browsing endpoint can be
   * used to inspect finalized approval decisions as historical accountability
   * records. The test focuses on completed-state filters, reviewer metadata, and
   * reviewed-at timestamps so the endpoint is validated as a history browser,
   * not merely a pending-request queue.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Query the approval-request list with completed-state historical filters.
   * 3. Validate pagination metadata and completed-record invariants.
   * 4. Conditionally validate approved and rejected records when they exist.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const now: Date = new Date();
  const createdAtFrom: string = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const createdAtTo: string = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const reviewedAtFrom: string = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const reviewedAtTo: string = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const approvedOutput =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      administratorConnection,
      {
        body: {
          status: "approved",
          createdAtFrom,
          createdAtTo,
          reviewedAtFrom,
          reviewedAtTo,
          page: 1,
          limit: 20,
          sort: "-reviewedAt",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(approvedOutput);
  TestValidator.predicate(
    "pagination current page is valid",
    approvedOutput.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    approvedOutput.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    approvedOutput.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    approvedOutput.pagination.pages >= 0,
  );
  for (const request of approvedOutput.data) {
    TestValidator.equals(
      "request status is approved",
      request.status,
      "approved",
    );
    TestValidator.predicate(
      "completed request has reviewer administrator",
      request.reviewerAdministrator !== null,
    );
    TestValidator.predicate(
      "completed request has reviewedAt",
      request.reviewedAt !== null,
    );
    TestValidator.equals(
      "approved request has no rejection reason",
      request.rejectionReason,
      null,
    );
    TestValidator.predicate(
      "createdAt is within requested lower bound",
      request.createdAt >= createdAtFrom,
    );
    TestValidator.predicate(
      "createdAt is within requested upper bound",
      request.createdAt <= createdAtTo,
    );
    TestValidator.predicate(
      "reviewedAt is within requested lower bound",
      request.reviewedAt !== null && request.reviewedAt >= reviewedAtFrom,
    );
    TestValidator.predicate(
      "reviewedAt is within requested upper bound",
      request.reviewedAt !== null && request.reviewedAt <= reviewedAtTo,
    );
    if (request.reviewerAdministrator !== null) {
      typia.assert(request.reviewerAdministrator);
      TestValidator.predicate(
        "reviewer administrator id exists",
        request.reviewerAdministrator.id.length > 0,
      );
      TestValidator.predicate(
        "reviewer administrator email exists",
        request.reviewerAdministrator.email.length > 0,
      );
      TestValidator.predicate(
        "reviewer administrator grade exists",
        request.reviewerAdministrator.grade.length > 0,
      );
      TestValidator.predicate(
        "reviewer administrator status exists",
        request.reviewerAdministrator.status.length > 0,
      );
    }
  }
  const rejectedOutput =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      administratorConnection,
      {
        body: {
          status: "rejected",
          createdAtFrom,
          createdAtTo,
          reviewedAtFrom,
          reviewedAtTo,
          page: 1,
          limit: 20,
          sort: "-reviewedAt",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(rejectedOutput);
  TestValidator.predicate(
    "rejected result pagination is valid",
    rejectedOutput.pagination.current >= 1,
  );
  TestValidator.predicate(
    "rejected result pages are non-negative",
    rejectedOutput.pagination.pages >= 0,
  );
  for (const request of rejectedOutput.data) {
    TestValidator.equals(
      "request status is rejected",
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      "rejected request has reviewer administrator",
      request.reviewerAdministrator !== null,
    );
    TestValidator.predicate(
      "rejected request has reviewedAt",
      request.reviewedAt !== null,
    );
    TestValidator.predicate(
      "rejected request has rejection reason text",
      request.rejectionReason !== null && request.rejectionReason.length > 0,
    );
  }
}
