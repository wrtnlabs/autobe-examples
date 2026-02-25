import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create super admin account and login using utility functions
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const joinResult = await authorize_super_admin_join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const loginResult =
    await api.functional.discussionBoard.auth.superAdmin.login(
      superAdminConnection,
      {
        body: {
          email: joinInput.email,
          password: joinInput.password,
        } satisfies IDiscussionBoardSuperAdmin.ILogin,
      },
    );
  typia.assert(loginResult);
  // Test 1: Basic session listing without filters
  const basicResult =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(basicResult);
  // Verify basic structure
  TestValidator.equals(
    "pagination exists",
    typeof basicResult.pagination,
    "object",
  );
  TestValidator.equals("data exists", Array.isArray(basicResult.data), true);
  // Test 2: Filter by active sessions only
  const activeSessionsResult =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          active: true,
        },
      },
    );
  typia.assert(activeSessionsResult);
  // All returned sessions should be active
  const allActive = activeSessionsResult.data.every(
    (session) => session.active === true,
  );
  TestValidator.predicate("all sessions are active", allActive);
  // Test 3: Filter by expired sessions only
  const expiredSessionsResult =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          active: false,
        },
      },
    );
  typia.assert(expiredSessionsResult);
  // All returned sessions should be expired
  const allExpired = expiredSessionsResult.data.every(
    (session) => session.active === false,
  );
  TestValidator.predicate("all sessions are expired", allExpired);
  // Test 4: Filter by IP address partial matching
  const ipFilterResult =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          ip: "192.168",
        },
      },
    );
  typia.assert(ipFilterResult);
  // Test 5: Filter by user agent
  const userAgentResult =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          user_agent: "Mozilla",
        },
      },
    );
  typia.assert(userAgentResult);
  // Test 6: Combined filters
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          active: true,
          ip: "192.168",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(combinedResult);
  // Verify pagination metadata
  TestValidator.equals("page is 1", combinedResult.pagination.current, 1);
  TestValidator.predicate(
    "limit is respected",
    combinedResult.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "has valid records count",
    combinedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    combinedResult.pagination.pages >= 0,
  );
  // Test 7: Verify session structure
  if (combinedResult.data.length > 0) {
    const session = combinedResult.data[0];
    // Verify required fields exist
    TestValidator.equals("session has id", typeof session.id, "string");
    TestValidator.equals(
      "session has super_admin_id",
      typeof session.super_admin_id,
      "string",
    );
    TestValidator.equals("session has ip", typeof session.ip, "string");
    TestValidator.equals(
      "session has active",
      typeof session.active,
      "boolean",
    );
    TestValidator.equals(
      "session has created_at",
      typeof session.created_at,
      "string",
    );
    TestValidator.equals(
      "session has expired_at",
      typeof session.expired_at,
      "string",
    );
    TestValidator.equals(
      "session has updated_at",
      typeof session.updated_at,
      "string",
    );
    // Verify super admin summary exists
    TestValidator.equals(
      "session has superAdmin",
      typeof session.superAdmin,
      "object",
    );
    TestValidator.equals(
      "superAdmin has id",
      typeof session.superAdmin.id,
      "string",
    );
    TestValidator.equals(
      "superAdmin has email",
      typeof session.superAdmin.email,
      "string",
    );
    TestValidator.equals(
      "superAdmin has created_at",
      typeof session.superAdmin.created_at,
      "string",
    );
  }
  // Test 8: Pagination with limit
  const paginationResult =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
        },
      },
    );
  typia.assert(paginationResult);
  // Limit should not exceed the actual limit
  TestValidator.predicate(
    "pagination limit respected",
    paginationResult.pagination.limit <= 5,
  );
  // Test 9: Large page limit validation
  const largeResult =
    await api.functional.discussionBoard.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(largeResult);
  // Verify maximum limit constraint
  TestValidator.predicate(
    "large result has valid pagination",
    largeResult.pagination.pages >= 0,
  );
}
