import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create sessions for different user types with proper connection isolation
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(userAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        privilege_level: "super_admin",
      },
    },
  );
  typia.assert(superAdminAuth);
  // Wait to ensure different creation times
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test filtering by session type with proper validation
  const userSessionsResponse =
    await api.functional.discussionBoard.user.sessions.index(userConnection, {
      body: {
        session_type: "user",
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(userSessionsResponse);
  TestValidator.predicate(
    "user sessions should be returned",
    userSessionsResponse.data.length > 0,
  );
  // Validate that only user sessions are returned
  for (const session of userSessionsResponse.data) {
    TestValidator.equals(
      "session should have user info",
      typeof session.user.id,
      "string",
    );
  }
  const adminSessionsResponse =
    await api.functional.discussionBoard.user.sessions.index(adminConnection, {
      body: {
        session_type: "admin",
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(adminSessionsResponse);
  TestValidator.predicate(
    "admin sessions should be returned",
    adminSessionsResponse.data.length > 0,
  );
  const superAdminSessionsResponse =
    await api.functional.discussionBoard.user.sessions.index(
      superAdminConnection,
      {
        body: {
          session_type: "super_admin",
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(superAdminSessionsResponse);
  TestValidator.predicate(
    "super admin sessions should be returned",
    superAdminSessionsResponse.data.length > 0,
  );
  // Test filtering by creation date range with exact validation
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const recentSessions =
    await api.functional.discussionBoard.user.sessions.index(userConnection, {
      body: {
        created_at_from: oneHourAgo.toISOString(),
        created_at_to: oneHourFromNow.toISOString(),
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(recentSessions);
  // Validate date range filtering
  for (const session of recentSessions.data) {
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      "session should be within date range",
      createdAt >= oneHourAgo && createdAt <= oneHourFromNow,
    );
  }
  // Test filtering by last activity range
  const activeSessions =
    await api.functional.discussionBoard.user.sessions.index(userConnection, {
      body: {
        last_accessed_at_from: oneHourAgo.toISOString(),
        last_accessed_at_to: oneHourFromNow.toISOString(),
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(activeSessions);
  // Test edge case: filtering with future dates (should return empty)
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const futureSessions =
    await api.functional.discussionBoard.user.sessions.index(userConnection, {
      body: {
        created_at_from: futureDate.toISOString(),
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(futureSessions);
  TestValidator.equals(
    "future date filter should return empty",
    futureSessions.data.length,
    0,
  );
  // Test pagination with validation
  const paginatedSessions =
    await api.functional.discussionBoard.user.sessions.index(userConnection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(paginatedSessions);
  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedSessions.data.length <= 5,
  );
  TestValidator.equals(
    "pagination metadata should be correct",
    paginatedSessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match",
    paginatedSessions.pagination.limit,
    5,
  );
  // Test combined filtering
  const combinedFilterSessions =
    await api.functional.discussionBoard.user.sessions.index(userConnection, {
      body: {
        session_type: "user",
        created_at_from: oneHourAgo.toISOString(),
        limit: 10,
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(combinedFilterSessions);
  // Validate session metadata structure
  if (combinedFilterSessions.data.length > 0) {
    const session = combinedFilterSessions.data[0];
    TestValidator.predicate(
      "session should have valid UUID ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "session should have valid IP address",
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(session.ip),
    );
    TestValidator.predicate(
      "session should have user agent",
      session.user_agent.length > 0,
    );
    TestValidator.predicate(
      "session should have valid creation date",
      !isNaN(new Date(session.created_at).getTime()),
    );
    TestValidator.predicate(
      "session should have valid expiration date",
      !isNaN(new Date(session.expired_at).getTime()),
    );
    TestValidator.predicate(
      "session should have valid last accessed date",
      !isNaN(new Date(session.last_accessed_at).getTime()),
    );
    TestValidator.predicate(
      "session should have user info",
      session.user.id.length > 0,
    );
    TestValidator.predicate(
      "session user should have display name",
      session.user.display_name.length > 0,
    );
    TestValidator.predicate(
      "session user should have valid creation date",
      !isNaN(new Date(session.user.created_at).getTime()),
    );
    TestValidator.predicate(
      "session user should have valid update date",
      !isNaN(new Date(session.user.updated_at).getTime()),
    );
  }
  // Test null filters (should return all sessions)
  const allSessions = await api.functional.discussionBoard.user.sessions.index(
    userConnection,
    {
      body: {
        session_type: null,
        created_at_from: null,
        created_at_to: null,
        last_accessed_at_from: null,
        last_accessed_at_to: null,
        ip_pattern: null,
        user_agent_search: null,
      } satisfies IDiscussionBoardUserSession.IRequest,
    },
  );
  typia.assert(allSessions);
  TestValidator.predicate(
    "null filters should return sessions",
    allSessions.data.length > 0,
  );
}
