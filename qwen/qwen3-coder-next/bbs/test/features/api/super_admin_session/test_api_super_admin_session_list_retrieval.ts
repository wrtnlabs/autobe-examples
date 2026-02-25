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

export async function test_api_super_admin_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register super admin account and authenticate
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test 1: Retrieve sessions with default pagination
  const sessions =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(sessions);
  // Test 2: Verify session data structure
  if (sessions.data.length > 0) {
    const firstSession = sessions.data[0];
    typia.assert(firstSession);
    // Verify required session fields exist
    TestValidator.equals("session has id", firstSession.id !== undefined, true);
    TestValidator.equals(
      "session has access_token",
      firstSession.access_token !== undefined,
      true,
    );
    TestValidator.equals(
      "session has refresh_token",
      firstSession.refresh_token !== undefined,
      true,
    );
    TestValidator.equals("session has ip", firstSession.ip !== undefined, true);
    TestValidator.equals(
      "session has active",
      firstSession.active !== undefined,
      true,
    );
    TestValidator.equals(
      "session has created_at",
      firstSession.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has expired_at",
      firstSession.expired_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has updated_at",
      firstSession.updated_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has superAdmin",
      firstSession.superAdmin !== undefined,
      true,
    );
    // Verify nested super admin details
    if (firstSession.superAdmin) {
      typia.assert(firstSession.superAdmin);
      TestValidator.equals(
        "super admin has id",
        firstSession.superAdmin.id !== undefined,
        true,
      );
      TestValidator.equals(
        "super admin has email",
        firstSession.superAdmin.email !== undefined,
        true,
      );
    }
  }
  // Test 3: Verify pagination structure
  typia.assert(sessions.pagination);
  TestValidator.equals(
    "pagination has current",
    sessions.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    sessions.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    sessions.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    sessions.pagination.pages !== undefined,
    true,
  );
  // Test 4: Test with specific pagination parameters
  const paginatedSessions =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(paginatedSessions);
  // Verify pagination parameters match request
  TestValidator.equals(
    "pagination limit matches request",
    paginatedSessions.pagination.limit,
    5,
  );
  // Test 5: Test filtering by active status
  const activeSessions =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {
          active: true,
        },
      },
    );
  typia.assert(activeSessions);
  // Verify all sessions are active if any exist
  if (activeSessions.data.length > 0) {
    activeSessions.data.forEach((session) => {
      TestValidator.equals(
        "session active status is true",
        session.active,
        true,
      );
    });
  }
  // Test 6: Test search functionality with IP filter
  const ipFilteredSessions =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {
          ip: "192.168", // Partial IP match
        },
      },
    );
  typia.assert(ipFilteredSessions);
}
