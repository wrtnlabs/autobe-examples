import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_filter_admin_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Setup: Create users with different admin privileges
  // Create regular users
  const regularUsers1 = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        search: undefined,
        isActive: null,
        isAdmin: false,
        isSuperAdmin: null,
        page: 1,
        limit: 50,
      },
    },
  );
  typia.assert(regularUsers1);
  const regularUsers2 = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        search: undefined,
        isActive: null,
        isAdmin: false,
        isSuperAdmin: null,
        page: 1,
        limit: 50,
      },
    },
  );
  typia.assert(regularUsers2);
  // Create admin users
  const adminUsers = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        search: undefined,
        isActive: null,
        isAdmin: true,
        isSuperAdmin: null,
        page: 1,
        limit: 50,
      },
    },
  );
  typia.assert(adminUsers);
  // Create super admin user
  const superAdminUsers = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        search: undefined,
        isActive: null,
        isAdmin: true,
        isSuperAdmin: true,
        page: 1,
        limit: 50,
      },
    },
  );
  typia.assert(superAdminUsers);
  // Test 1: Filter by admin status (isAdmin: true)
  const adminFilter = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: undefined,
        isActive: null,
        isAdmin: true,
        isSuperAdmin: null,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(adminFilter);
  // Verify all returned users have is_admin: true
  for (const user of adminFilter.data) {
    TestValidator.predicate("user is admin", user.is_admin === true);
  }
  // Test 2: Filter by super admin status (isSuperAdmin: true)
  const superAdminFilter = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: undefined,
        isActive: null,
        isSuperAdmin: true,
        isAdmin: null,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(superAdminFilter);
  // Verify all returned users have is_super_admin: true
  for (const user of superAdminFilter.data) {
    TestValidator.predicate(
      "user is super admin",
      user.is_super_admin === true,
    );
  }
  // Test 3: Filter by non-admin status (isAdmin: false)
  const nonAdminFilter = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: undefined,
        isActive: null,
        isAdmin: false,
        isSuperAdmin: null,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(nonAdminFilter);
  // Verify all returned users have is_admin: false
  for (const user of nonAdminFilter.data) {
    TestValidator.predicate("user is not admin", user.is_admin === false);
  }
  // Test 4: Combination filter - active + admin
  const activeAdminFilter = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: undefined,
        isActive: true,
        isAdmin: true,
        isSuperAdmin: null,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(activeAdminFilter);
  // Verify all returned users are active admins
  for (const user of activeAdminFilter.data) {
    TestValidator.predicate(
      "active admin user",
      user.is_active === true && user.is_admin === true,
    );
  }
  // Test 5: Pagination with filters
  const paginatedFilter = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: undefined,
        isActive: null,
        isAdmin: true,
        isSuperAdmin: null,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(paginatedFilter);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination records",
    paginatedFilter.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination limit",
    paginatedFilter.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages",
    paginatedFilter.pagination.pages >= 1,
  );
}