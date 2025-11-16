import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminuser";

/**
 * Verify admin user listing supports filtering by account status and role for
 * the authenticated administrator and returns correct pagination metadata.
 *
 * Business flow (rewritten to match available APIs):
 *
 * 1. Provision multiple administrator accounts using POST /auth/adminUser/join.
 *
 *    - Each join call creates a new admin user row and issues JWT tokens.
 *    - The SDK automatically updates `connection.headers.Authorization` to the newly
 *         created admin's access token.
 * 2. Treat the last created admin user as the "primary" authenticated actor for
 *    listing operations.
 *
 *    - Read its `status` and `role` fields from
 *         `IDiscussionBoardAdminuser.IAuthorized`.
 * 3. Call PATCH /discussionBoard/adminUser/adminUsers with
 *    `IDiscussionBoardAdminuser.IRequest` configured to:
 *
 *    - Filter by `status` equal to the primary admin's `status`.
 *    - Filter by `role` equal to the primary admin's `role`.
 *    - Apply a deterministic sort order (e.g., orderBy="createdAt",
 *         orderDirection="desc").
 *    - Request the first page (page=1) with a reasonable limit.
 * 4. Validate the listing response `IPageIDiscussionBoardAdminuser.ISummary`:
 *
 *    - `typia.assert()` the entire response for strict type conformance.
 *    - Assert pagination invariants:
 *
 *         - `records` and `pages` are non-negative.
 *         - If `records === 0` then `pages === 0` and `data.length === 0`.
 *         - If `records > 0` then `pages >= 1`, `data.length >= 1`, and `data.length <=
 *                   pagination.limit`.
 *         - `current` is zero-based and within valid range when pages > 0.
 * 5. Validate filtering semantics (within what the DTO exposes):
 *
 *    - For every returned `IDiscussionBoardAdminuser.ISummary`, `account_status`
 *         must equal the requested `status` filter.
 *    - Optionally, when the primary admin appears in the result set, verify that its
 *         `account_status` also matches the requested status, without requiring
 *         that it must be present on the first page (to remain robust in shared
 *         environments and large datasets).
 */
export async function test_api_admin_user_list_filtered_by_status_and_role(
  connection: api.IConnection,
) {
  // 1. Provision multiple administrator accounts via join
  const adminCount = 3;
  const authorizedAdmins: IDiscussionBoardAdminuser.IAuthorized[] = [];

  for (let index = 0; index < adminCount; index++) {
    const joinBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdminUserJoin.IRequest;

    const joined = await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
    typia.assert(joined);
    authorizedAdmins.push(joined);
  }

  // 2. Use the last created admin as the primary authenticated actor
  const primaryAdmin = authorizedAdmins[authorizedAdmins.length - 1];

  // 3. Build listing request filtered by primary admin's status and role
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const listRequestBody = {
    status: primaryAdmin.status,
    role: primaryAdmin.role,
    orderBy: "createdAt",
    orderDirection: "desc" as const,
    page,
    limit,
  } satisfies IDiscussionBoardAdminuser.IRequest;

  const pageResult =
    await api.functional.discussionBoard.adminUser.adminUsers.index(
      connection,
      {
        body: listRequestBody,
      },
    );
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // 4. Pagination invariants
  TestValidator.predicate(
    "pagination.records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be non-negative",
    pagination.limit >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals("no records implies no pages", pagination.pages, 0);
    TestValidator.equals("no records implies empty data", data.length, 0);
  } else {
    TestValidator.predicate(
      "records > 0 implies at least one page",
      pagination.pages >= 1,
    );
    TestValidator.predicate(
      "records > 0 implies at least one row in data",
      data.length >= 1,
    );
    TestValidator.predicate(
      "page size constraint: data.length <= limit",
      data.length <= pagination.limit,
    );
  }

  if (pagination.pages > 0) {
    TestValidator.predicate(
      "current page index must be within [0, pages)",
      pagination.current >= 0 && pagination.current < pagination.pages,
    );
  }

  // 5. Filtering semantics: account_status must match requested status
  for (const summary of data) {
    TestValidator.equals(
      "each summary.account_status must equal requested status",
      summary.account_status,
      primaryAdmin.status,
    );
  }

  // When the primary admin appears in this page, verify its status too,
  // but do not require its presence (to avoid brittle assumptions about
  // global dataset size or ordering).
  if (data.length > 0) {
    const primarySummary = data.find((row) => row.email === primaryAdmin.email);

    if (primarySummary !== undefined) {
      typia.assert(primarySummary);
      TestValidator.equals(
        "primary summary.account_status matches filter status",
        primarySummary.account_status,
        primaryAdmin.status,
      );
    }
  }
}
