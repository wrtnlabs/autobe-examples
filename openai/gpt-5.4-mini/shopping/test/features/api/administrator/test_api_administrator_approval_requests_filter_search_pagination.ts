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
 * Verify administrator approval request search, status filtering, and pagination consistency.
 *
 * This test authenticates an administrator account and queries the approval request review endpoint with keyword search, status filters, and pagination parameters. It validates that the returned page metadata is internally consistent and that repeated requests with the same criteria return the same ordered result set.
 *
 * The scenario focuses on governance review behavior for pending, approved, and rejected approval requests. Because the available test API is read-only for this resource, the test validates filtering and pagination against the current dataset rather than mutating records.
 *
 * 1. Authenticate an administrator through the join utility using a dedicated connection.
 * 2. Query approval requests with search and status filters.
 * 3. Validate pagination metadata and stable repeated responses.
 * 4. Ensure approved and rejected filters only return matching records when those states exist.
 */
export async function test_api_administrator_approval_requests_filter_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const baseRequest = {
    page: 1,
    limit: 2,
  } satisfies IMallPlatformAdministratorApprovalRequest.IRequest;
  const firstPage =
    await api.functional.mallPlatform.administrator.approvalRequests.index(
      administratorConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(firstPage);
  const repeatedPage =
    await api.functional.mallPlatform.administrator.approvalRequests.index(
      administratorConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(repeatedPage);
  TestValidator.equals(
    "repeated query should be stable",
    firstPage,
    repeatedPage,
  );
  TestValidator.equals(
    "pagination current page should match request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    firstPage.pagination.limit,
    2,
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
    "returned records should not exceed page size",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  const pendingFiltered =
    await api.functional.mallPlatform.administrator.approvalRequests.index(
      administratorConnection,
      {
        body: {
          ...baseRequest,
          status: "pending",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingFiltered);
  TestValidator.predicate(
    "pending filter should only return pending requests",
    pendingFiltered.data.every((item) => item.status === "pending"),
  );
  const approvedFiltered =
    await api.functional.mallPlatform.administrator.approvalRequests.index(
      administratorConnection,
      {
        body: {
          ...baseRequest,
          status: "approved",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(approvedFiltered);
  TestValidator.predicate(
    "approved filter should only return approved requests",
    approvedFiltered.data.every((item) => item.status === "approved"),
  );
  const rejectedFiltered =
    await api.functional.mallPlatform.administrator.approvalRequests.index(
      administratorConnection,
      {
        body: {
          ...baseRequest,
          status: "rejected",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(rejectedFiltered);
  TestValidator.predicate(
    "rejected filter should only return rejected requests",
    rejectedFiltered.data.every((item) => item.status === "rejected"),
  );
  TestValidator.predicate(
    "rejected requests should expose a rejection reason or a pending review state only when applicable",
    rejectedFiltered.data.every(
      (item) => item.status !== "rejected" || item.rejectionReason !== null,
    ),
  );
  const keyword =
    pendingFiltered.data[0]?.reason ??
    approvedFiltered.data[0]?.reason ??
    rejectedFiltered.data[0]?.reason;
  if (keyword !== undefined) {
    const searchable = keyword.length >= 3 ? keyword.slice(0, 3) : keyword;
    const searchFiltered =
      await api.functional.mallPlatform.administrator.approvalRequests.index(
        administratorConnection,
        {
          body: {
            ...baseRequest,
            search: searchable,
          } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
        },
      );
    typia.assert(searchFiltered);
    TestValidator.predicate(
      "search results should match the keyword in request reason",
      searchFiltered.data.every((item) => item.reason.includes(searchable)),
    );
    TestValidator.predicate(
      "search results should not exceed requested page size",
      searchFiltered.data.length <= searchFiltered.pagination.limit,
    );
  }
}
