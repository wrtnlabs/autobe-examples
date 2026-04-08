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

export async function test_api_administrator_approval_requests_list_governance(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test governance browsing of administrator approval requests.
   *
   * Validates that an authorized administrator can browse the administrator
   * approval-request list endpoint and receive a properly shaped paginated page
   * response. The test focuses on response contract stability, summary-field
   * presence, nullable lifecycle fields, and pagination metadata consistency.
   *
   * 1. Authenticate an administrator connection using the provided join utility.
   * 2. Query the approval-request listing endpoint with default browsing controls.
   * 3. Validate the paginated response shape and the summary record contract.
   * 4. Confirm nullable reviewer, rejection, reviewed, and deleted fields are
   *    handled without breaking the response schema.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234!abcd",
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const output =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.index(
      administratorConnection,
      {
        body: {} satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(output.data));
  TestValidator.predicate(
    "page size does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  for (const summary of output.data) {
    typia.assert(summary);
    TestValidator.predicate("summary identifier exists", summary.id.length > 0);
    TestValidator.predicate(
      "applicant administrator exists",
      summary.administrator.id.length > 0,
    );
    TestValidator.predicate("reason exists", summary.reason.length > 0);
    TestValidator.predicate("status exists", summary.status.length > 0);
    TestValidator.predicate("createdAt exists", summary.createdAt.length > 0);
    TestValidator.predicate("updatedAt exists", summary.updatedAt.length > 0);
    TestValidator.predicate(
      "deletedAt is nullable",
      summary.deletedAt === null || summary.deletedAt.length > 0,
    );
    TestValidator.predicate(
      "reviewer administrator is nullable",
      summary.reviewerAdministrator === null ||
        summary.reviewerAdministrator.id.length > 0,
    );
    TestValidator.predicate(
      "rejection reason is nullable",
      summary.rejectionReason === null || summary.rejectionReason.length > 0,
    );
    TestValidator.predicate(
      "reviewedAt is nullable",
      summary.reviewedAt === null || summary.reviewedAt.length > 0,
    );
  }
}
