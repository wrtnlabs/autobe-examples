import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_admin_session_filter_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Filter by non-existent adminId (valid UUID format but doesn't exist in database)
  const nonexistentAdminId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const result1 =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          adminId: nonexistentAdminId,
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "nonexistent admin returns empty",
    result1.data.length,
    0,
  );
  TestValidator.equals("pagination correct", result1.pagination.current, 1);
  TestValidator.equals("pagination correct", result1.pagination.limit, 10);
  TestValidator.equals("pagination correct", result1.pagination.records, 0);
  TestValidator.equals("pagination correct", result1.pagination.pages, 0);
  // Test 2: Filter by super admin's own ID (this admin should have sessions from login)
  const filterResult =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          adminId: superAdmin.id,
          page: 1,
          limit: 100,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(filterResult);
  // Verify we got at least the session from our login
  TestValidator.predicate(
    "at least one session for super admin",
    () => filterResult.data.length >= 1,
  );
  // Verify pagination
  TestValidator.equals(
    "pagination records correct",
    filterResult.pagination.records,
    filterResult.data.length,
  );
  TestValidator.equals(
    "pagination pages correct",
    filterResult.pagination.pages,
    Math.ceil(filterResult.data.length / 100),
  );
  // Verify sorting (most recent first)
  if (filterResult.data.length >= 2) {
    for (let i = 0; i < filterResult.data.length - 1; i++) {
      TestValidator.predicate("sorted by created_at desc", () => {
        return (
          new Date(filterResult.data[i].created_at) >=
          new Date(filterResult.data[i + 1].created_at)
        );
      });
    }
  }
  // Verify admin profile data is included in each session
  for (const session of filterResult.data) {
    typia.assert(session.admin);
    TestValidator.equals("admin id matches", session.admin.id, superAdmin.id);
    TestValidator.predicate("admin has display_name", () =>
      Boolean(session.admin.display_name),
    );
    TestValidator.predicate("admin has email", () =>
      Boolean(session.admin.email),
    );
  }
  // Test 3: Pagination with different limit
  const paginationResult =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          adminId: superAdmin.id,
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit respects 1",
    paginationResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination records total",
    paginationResult.pagination.records,
    filterResult.data.length,
  );
  TestValidator.equals(
    "pagination pages total",
    paginationResult.pagination.pages,
    filterResult.data.length,
  );
  // Test 4: Second page when multiple results exist
  if (filterResult.data.length >= 2) {
    const page2Result =
      await api.functional.discussionBoard.superAdmin.admin_sessions.index(
        superAdminConnection,
        {
          body: {
            adminId: superAdmin.id,
            page: 2,
            limit: 1,
          } satisfies IDiscussionBoardAdminSession.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals("page 2 has one result", page2Result.data.length, 1);
    TestValidator.equals(
      "different session on page 2",
      page2Result.data[0].id !== filterResult.data[0].id,
      true,
    );
  }
  // Test 5: Invalid adminId format
  try {
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          adminId: "not-a-uuid",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
    throw new Error("Should have thrown error");
  } catch (error) {
    TestValidator.httpError("invalid adminId format error", 400, () => {
      throw error;
    });
  }
  // Test 6: Test with no sorting specified (default behavior)
  const defaultSortResult =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          adminId: superAdmin.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(defaultSortResult);
  TestValidator.equals(
    "default sort returns results",
    defaultSortResult.data.length >= 1,
    true,
  );
  // Test 7: Test filtering with IP address parameter (optional filter)
  const ipFilteredResult =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          adminId: superAdmin.id,
          ip: "127.0.0.1", // May not match any sessions
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(ipFilteredResult);
  // Test 8: Test filtering by active status
  const activeSessionsResult =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          adminId: superAdmin.id,
          isActive: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(activeSessionsResult);
  const inactiveSessionsResult =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          adminId: superAdmin.id,
          isActive: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(inactiveSessionsResult);
}
