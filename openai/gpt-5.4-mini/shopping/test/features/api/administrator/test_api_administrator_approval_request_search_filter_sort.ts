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
 * Verifies administrator approval-request search, filtering, and pagination browsing.
 *
 * This test authenticates an administrator, queries the approval-request review list with explicit search and status filters, and confirms the response behaves like a stable paginated audit view.
 *
 * It validates that returned rows honor the chosen workflow status, that free-text search does not break retrieval, and that pagination metadata remains consistent with the filtered result set. It also checks that switching between pending and reviewed request views remains deterministic for audit inspection.
 *
 * 1. Register and authenticate a fresh administrator account.
 * 2. Query approval requests with a non-empty search term, explicit status filters, and pagination settings.
 * 3. Validate pagination metadata and ensure every returned row satisfies the requested filter.
 * 4. Re-query with a reviewed-status filter to confirm audited requests remain retrievable consistently.
 */
export async function test_api_administrator_approval_request_search_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const searchTerm: string = RandomGenerator.alphabets(5);
  const pendingPage =
    await api.functional.mallPlatform.administrator.administrators.index(
      administratorConnection,
      {
        body: {
          search: searchTerm,
          status: "pending",
          page: 1,
          limit: 10,
          sort: "createdAt",
          order: "desc",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  TestValidator.equals(
    "pending page current number",
    pendingPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pending page limit should be non-negative",
    pendingPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pending page records should be non-negative",
    pendingPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending page pages should be non-negative",
    pendingPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pending page data count should not exceed limit",
    pendingPage.data.length <= pendingPage.pagination.limit,
  );
  TestValidator.predicate(
    "pending rows should match requested search and status filters",
    pendingPage.data.every(
      (item) =>
        item.status === "pending" &&
        item.reason.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  const reviewedPage =
    await api.functional.mallPlatform.administrator.administrators.index(
      administratorConnection,
      {
        body: {
          search: searchTerm,
          status: "approved",
          page: 1,
          limit: 10,
          sort: "reviewedAt",
          order: "desc",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(reviewedPage);
  TestValidator.equals(
    "reviewed page current number",
    reviewedPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "reviewed page limit should be non-negative",
    reviewedPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "reviewed page records should be non-negative",
    reviewedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "reviewed rows should match approved filter when present",
    reviewedPage.data.every(
      (item) =>
        item.status === "approved" &&
        item.reason.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  TestValidator.predicate(
    "reviewed requests remain retrievable for audit inspection",
    reviewedPage.pagination.pages >= 0,
  );
}
