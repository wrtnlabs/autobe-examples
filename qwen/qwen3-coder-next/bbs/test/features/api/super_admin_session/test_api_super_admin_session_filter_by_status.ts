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

export async function test_api_super_admin_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminData = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(superAdminData);
  // Test 1: Filter for active sessions
  const activeSessionsResponse =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {
          active: true,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(activeSessionsResponse);
  // Verify active sessions contain only active=true sessions
  activeSessionsResponse.data.forEach((session) => {
    TestValidator.equals("session is active", session.active, true);
  });
  // Test 2: Filter for expired sessions
  const expiredSessionsResponse =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {
          active: false,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(expiredSessionsResponse);
  // Verify expired sessions contain only active=false sessions
  expiredSessionsResponse.data.forEach((session) => {
    TestValidator.equals("session is expired", session.active, false);
  });
  // Test 3: Verify no overlap between active and expired sessions
  const activeSessionIds = new Set(
    activeSessionsResponse.data.map((session) => session.id),
  );
  const expiredSessionIds = new Set(
    expiredSessionsResponse.data.map((session) => session.id),
  );
  const hasOverlap = [...activeSessionIds].some((id) =>
    expiredSessionIds.has(id),
  );
  TestValidator.predicate(
    "no overlap between active and expired sessions",
    !hasOverlap,
  );
  // Test 4: Verify pagination structure consistency
  TestValidator.equals(
    "active pagination has correct structure",
    activeSessionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "expired pagination has correct structure",
    expiredSessionsResponse.pagination.current,
    1,
  );
  // Test 5: Verify session data structure consistency
  if (activeSessionsResponse.data.length > 0) {
    const firstSession = activeSessionsResponse.data[0];
    TestValidator.predicate(
      "session has superAdmin",
      firstSession.superAdmin !== null && firstSession.superAdmin !== undefined,
    );
    TestValidator.equals(
      "superAdmin has email",
      typeof firstSession.superAdmin.email,
      "string",
    );
  }
  if (expiredSessionsResponse.data.length > 0) {
    const firstExpiredSession = expiredSessionsResponse.data[0];
    TestValidator.predicate(
      "expired session has superAdmin",
      firstExpiredSession.superAdmin !== null &&
        firstExpiredSession.superAdmin !== undefined,
    );
    TestValidator.equals(
      "expired superAdmin has email",
      typeof firstExpiredSession.superAdmin.email,
      "string",
    );
  }
}
