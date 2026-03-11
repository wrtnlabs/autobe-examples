import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test advanced filtering capabilities of admin accounts search endpoint.
 *
 * Verify that search functionality works correctly with email pattern matching,
 * display name filtering, case-insensitive searches, date range filtering,
 * and soft-delete filtering.
 */
export async function test_api_admin_accounts_filtering_email_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create separate connections for each admin to avoid token conflicts
  const adminConnections: api.IConnection[] = [];
  // Create multiple test admin accounts with varied email patterns and display names
  const testAdmins = ArrayUtil.repeat(6, (index) => {
    const baseName = ["admin", "super", "power", "master", "root", "sys"][
      index
    ];
    return {
      email:
        index === 0
          ? `test.${baseName}@example.com`
          : index === 1
            ? `${baseName}_user@gmail.com`
            : index === 2
              ? `${baseName}.support@company.org`
              : index === 3
                ? `admin_${baseName}@test.co.uk`
                : index === 4
                  ? `${baseName}123@domain.io`
                  : `${baseName}.system@enterprise.net`,
      password: "password123",
      display_name:
        index === 0
          ? `Super ${baseName.charAt(0).toUpperCase() + baseName.slice(1)}`
          : index === 1
            ? `${baseName.toUpperCase()} Administrator`
            : index === 2
              ? `Main ${baseName}`
              : index === 3
                ? `${baseName} Manager`
                : index === 4
                  ? `Lead ${baseName}`
                  : `${baseName} Director`,
    } satisfies IMultiUserTodoAdmin.IJoin;
  });
  // Create admin accounts using utility function
  const createdAdmins: IMultiUserTodoAdmin.IAuthorized[] = [];
  for (const testAdmin of testAdmins) {
    const adminConnection: api.IConnection = { host: connection.host };
    adminConnections.push(adminConnection);
    const createdAdmin = await authorize_admin_join(adminConnection, {
      body: testAdmin,
    });
    typia.assert(createdAdmin);
    createdAdmins.push(createdAdmin);
  }
  // Save timestamps for date range filtering tests
  const earliestCreatedAt = createdAdmins[0].created_at;
  const middleCreatedAt = createdAdmins[2].created_at;
  const latestCreatedAt = createdAdmins[5].created_at;
  // Wait a moment to ensure updated_at timestamps differ
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Use one admin connection for all search tests
  const searchConnection = adminConnections[0];
  // TEST 1: Basic email pattern matching
  const emailSearch = await api.functional.multiUserTodo.admins.index(
    searchConnection,
    {
      body: {
        search: "example.com",
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(emailSearch);
  TestValidator.equals(
    "should find admin with example.com email",
    emailSearch.data.length,
    1,
  );
  TestValidator.equals(
    "email should match pattern",
    emailSearch.data[0].email,
    testAdmins[0].email,
  );
  // TEST 2: Display name partial match
  const displayNameSearch = await api.functional.multiUserTodo.admins.index(
    searchConnection,
    {
      body: {
        search: "Manager",
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(displayNameSearch);
  TestValidator.predicate(
    "should find at least one manager",
    displayNameSearch.data.length >= 1,
  );
  // TEST 3: Case-insensitive search
  const caseInsensitiveSearch = await api.functional.multiUserTodo.admins.index(
    searchConnection,
    {
      body: {
        search: "SUPER", // uppercase search
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(caseInsensitiveSearch);
  // Should find admin with "Super" in display name (testAdmins[0])
  TestValidator.predicate(
    "case-insensitive search should find matches",
    caseInsensitiveSearch.data.length >= 1,
  );
  // TEST 4: Date range filtering (created_at)
  const dateRangeSearch = await api.functional.multiUserTodo.admins.index(
    searchConnection,
    {
      body: {
        created_at_start: earliestCreatedAt,
        created_at_end: latestCreatedAt,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(dateRangeSearch);
  TestValidator.equals(
    "date range should include all admins",
    dateRangeSearch.data.length,
    6,
  );
  // TEST 5: Pagination testing
  const page1 = await api.functional.multiUserTodo.admins.index(
    searchConnection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 should have 3 items", page1.data.length, 3);
  TestValidator.equals(
    "page 1 current should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit should be 3", page1.pagination.limit, 3);
  const page2 = await api.functional.multiUserTodo.admins.index(
    searchConnection,
    {
      body: {
        page: 2,
        limit: 3,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 should have 3 items", page2.data.length, 3);
  TestValidator.equals(
    "page 2 current should be 2",
    page2.pagination.current,
    2,
  );
  // TEST 6: Combined search with pagination
  const combinedSearch = await api.functional.multiUserTodo.admins.index(
    searchConnection,
    {
      body: {
        search: "admin",
        limit: 2,
        page: 1,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search should return paginated results",
    combinedSearch.data.length <= 2,
  );
  // TEST 7: Empty search (should return all when no criteria)
  const emptySearch = await api.functional.multiUserTodo.admins.index(
    searchConnection,
    {
      body: {} satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should return all admins",
    emptySearch.data.length,
    6,
  );
  // Note: Cannot test include_deleted parameter since we cannot delete admin accounts
  // in this test (no deletion endpoint available in the provided APIs)
}
