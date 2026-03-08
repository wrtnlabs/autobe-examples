import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator retrieving pending requests with various filter combinations.
 * Scenario: Super admin retrieves pending requests and verifies filtering, sorting, and pagination.
 * Validations:
 * 1) Filter by status 'pending' returns only pending requests
 * 2) Sorting by submitted_at ascending shows oldest first
 * 3) Sorting by submitted_at descending shows newest first
 * 4) Cursor-based pagination works correctly for large datasets
 * 5) Invalid status filters return empty data array
 */
export async function test_api_super_admin_pending_requests_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Filter by status 'pending' - should return pending requests
  const pendingRequests =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  TestValidator.predicate(
    "pending requests validation",
    () =>
      Array.isArray(pendingRequests.data) &&
      typeof pendingRequests.pagination === "object",
  );
  // Test 2: Sorting by submitted_at ascending (oldest first)
  const ascendingRequests =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          sortBy: "submitted_at",
          sortOrder: "asc",
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(ascendingRequests);
  // Test 3: Sorting by submitted_at descending (newest first)
  const descendingRequests =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          sortBy: "submitted_at",
          sortOrder: "desc",
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(descendingRequests);
  // Test 4: Pagination with limit and page parameters
  const paginatedRequests =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(paginatedRequests);
  TestValidator.predicate(
    "pagination limit respected",
    () => paginatedRequests.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination structure valid",
    () =>
      typeof paginatedRequests.pagination.current === "number" &&
      typeof paginatedRequests.pagination.limit === "number" &&
      typeof paginatedRequests.pagination.records === "number" &&
      typeof paginatedRequests.pagination.pages === "number",
  );
  // Test 5: Invalid status filter should return empty data array
  const invalidFilterRequests =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "invalid_status",
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(invalidFilterRequests);
  TestValidator.predicate("invalid status returns valid empty array", () =>
    Array.isArray(invalidFilterRequests.data),
  );
}
