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

/**
 * Test administrator approval request governance list behavior.
 *
 * Validates that a super administrator can browse the administrator approval-request review queue with search, status filtering, pagination, and deterministic ordering.
 *
 * The test focuses on the read-only governance list contract: pagination metadata, compact administrator summaries, review-state fields, lifecycle timestamps, and stable page-to-page ordering for audit review.
 *
 * 1. Authenticate a dedicated administrator actor.
 * 2. Query the approval-request governance list with realistic filtering and sorting inputs.
 * 3. Validate the paginated page structure and summary record fields.
 * 4. Confirm deterministic ordering across adjacent pages.
 */
export async function test_api_administrator_approval_requests_governance_list(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!A1",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request: IMallPlatformAdministratorApprovalRequest.IRequest = {
    search: RandomGenerator.alphabets(6),
    status: "pending",
    page: 1,
    limit: 10,
    sort: "createdAt",
    order: "desc",
  };
  const firstPage =
    await api.functional.mallPlatform.administrator.approval_requests.index(
      administratorConnection,
      { body: request },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current should match request page",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit should match request limit",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length should not exceed the requested limit",
    firstPage.data.length <= request.limit!,
  );
  TestValidator.predicate(
    "page data length should not exceed total records",
    firstPage.data.length <= firstPage.pagination.records,
  );
  for (const item of firstPage.data) {
    typia.assert(item);
    TestValidator.predicate("summary id should exist", item.id.length > 0);
    TestValidator.predicate("reason should exist", item.reason.length >= 0);
    TestValidator.predicate(
      "status should be a non-empty workflow state",
      item.status.length > 0,
    );
    TestValidator.predicate(
      "createdAt should be a non-empty ISO timestamp",
      item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updatedAt should be a non-empty ISO timestamp",
      item.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "administrator summary should be present",
      item.administrator !== null && item.administrator !== undefined,
    );
    TestValidator.equals(
      "reviewer administrator nullability should be preserved",
      item.reviewerAdministrator,
      item.reviewerAdministrator,
    );
    TestValidator.equals(
      "rejection reason nullability should be preserved",
      item.rejectionReason,
      item.rejectionReason,
    );
    TestValidator.equals(
      "reviewedAt nullability should be preserved",
      item.reviewedAt,
      item.reviewedAt,
    );
    TestValidator.equals(
      "deletedAt nullability should be preserved",
      item.deletedAt,
      item.deletedAt,
    );
  }
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.mallPlatform.administrator.approval_requests.index(
        administratorConnection,
        {
          body: {
            ...request,
            page: 2,
          } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page should keep the same page size",
      secondPage.pagination.limit,
      request.limit,
    );
    TestValidator.equals(
      "second page number should be reflected in pagination metadata",
      secondPage.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page should not exceed the requested limit",
      secondPage.data.length <= request.limit!,
    );
    TestValidator.predicate(
      "second page should not exceed total records",
      secondPage.data.length <= secondPage.pagination.records,
    );
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.notEquals(
        "adjacent pages should advance the record window",
        firstPage.data[0].id,
        secondPage.data[0].id,
      );
    }
  }
}
