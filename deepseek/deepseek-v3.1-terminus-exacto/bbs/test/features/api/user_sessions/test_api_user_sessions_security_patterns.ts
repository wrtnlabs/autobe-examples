import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_security_patterns(
  connection: api.IConnection,
): Promise<void> {
  // Create a user session to ensure we have at least one session to test with
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test IP pattern matching with common patterns
  const ipPatternTests = [
    { pattern: "192.168.%", description: "192.168 subnet match" },
    { pattern: "10.%", description: "10.x subnet match" },
    { pattern: "172.16.%", description: "172.16 subnet match" },
    { pattern: null, description: "null pattern returns all" },
    { pattern: "%.%.%.%", description: "all IPs match" },
  ];
  // Test user agent pattern matching with common patterns
  const userAgentTests = [
    { pattern: "Mozilla%", description: "Mozilla browsers match" },
    { pattern: "%Windows%", description: "Windows user agent match" },
    { pattern: "%AppleWebKit%", description: "WebKit browsers match" },
    { pattern: null, description: "null pattern returns all" },
  ];
  // Test IP pattern matching
  for (const test of ipPatternTests) {
    const response = await api.functional.discussionBoard.user.sessions.index(
      connection,
      {
        body: {
          ip_pattern: test.pattern,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      `IP pattern '${test.pattern}' should return valid session data`,
      Array.isArray(response.data),
    );
  }
  // Test user agent pattern matching
  for (const test of userAgentTests) {
    const response = await api.functional.discussionBoard.user.sessions.index(
      connection,
      {
        body: {
          user_agent_search: test.pattern,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      `User agent pattern '${test.pattern}' should return valid session data`,
      Array.isArray(response.data),
    );
  }
  // Test combined filtering
  const combinedResponse =
    await api.functional.discussionBoard.user.sessions.index(connection, {
      body: {
        ip_pattern: "%.%.%.%",
        user_agent_search: "%",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "Combined filter should return valid session data",
    Array.isArray(combinedResponse.data),
  );
  // Test empty patterns (should return all sessions)
  const emptyPatternResponse =
    await api.functional.discussionBoard.user.sessions.index(connection, {
      body: {
        ip_pattern: null,
        user_agent_search: null,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(emptyPatternResponse);
  TestValidator.predicate(
    "Null patterns should return session data",
    Array.isArray(emptyPatternResponse.data),
  );
  // Validate session summary structure for the first session (if any exist)
  const allSessions = await api.functional.discussionBoard.user.sessions.index(
    connection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IDiscussionBoardUserSession.IRequest,
    },
  );
  typia.assert(allSessions);
  if (allSessions.data.length > 0) {
    const session = allSessions.data[0];
    typia.assert(session);
    TestValidator.predicate(
      "Session should have valid IP address format",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "Session should have user agent",
      typeof session.user_agent === "string" && session.user_agent.length > 0,
    );
    TestValidator.predicate(
      "Session should have creation timestamp",
      typeof session.created_at === "string" && session.created_at.length > 0,
    );
    TestValidator.predicate(
      "Session should have expiration timestamp",
      typeof session.expired_at === "string" && session.expired_at.length > 0,
    );
    TestValidator.predicate(
      "Session should have last access timestamp",
      typeof session.last_accessed_at === "string" &&
        session.last_accessed_at.length > 0,
    );
    TestValidator.predicate(
      "Session should have user summary",
      typeof session.user.display_name === "string" &&
        session.user.display_name.length > 0,
    );
    // Verify no sensitive authentication tokens are exposed in the session summary
    TestValidator.predicate(
      "Session should not contain access token property",
      !("access" in session),
    );
    TestValidator.predicate(
      "Session should not contain refresh token property",
      !("refresh" in session),
    );
    TestValidator.predicate(
      "Session should not contain token property",
      !("token" in session),
    );
  }
  // Test pagination with patterns
  const paginatedResponse =
    await api.functional.discussionBoard.user.sessions.index(connection, {
      body: {
        ip_pattern: "%.%.%.%",
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "Pagination should work with pattern filtering",
    paginatedResponse.pagination.limit === 5 &&
      paginatedResponse.pagination.current === 1,
  );
}
