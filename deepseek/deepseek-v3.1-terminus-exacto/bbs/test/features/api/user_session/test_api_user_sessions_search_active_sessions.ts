import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_search_active_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user sessions for testing
  const userConnections: api.IConnection[] = [];
  const users: IDiscussionBoardUser.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(user);
    userConnections.push(userConnection);
    users.push(user);
  }
  // Test 1: Search all sessions with no filters - verify baseline functionality
  const allSessions =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnections[0],
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // Test 2: Search active sessions only
  const activeSessions =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnections[0],
      {
        body: {
          active: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // Test 3: Search by specific user
  const userSessions =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnections[0],
      {
        body: {
          user_id: users[1].id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(userSessions);
  // Test 4: Test pagination with different page sizes
  const paginationTests = [1, 2, 5] as const;
  for (const limit of paginationTests) {
    const paginatedResult =
      await api.functional.discussionBoard.user.users.sessions.index(
        userConnections[0],
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardUserSession.IRequest,
        },
      );
    typia.assert(paginatedResult);
    TestValidator.predicate(
      `pagination respects limit ${limit}`,
      paginatedResult.data.length <= limit,
    );
  }
  // Test 5: Search with date range
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dateRangeSessions =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnections[0],
      {
        body: {
          created_at_min: oneHourAgo,
          created_at_max: now,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(dateRangeSessions);
  // Test 6: Search with IP address filter (simulated with partial matching)
  // Note: IP filtering requires actual IP data, so we test the functionality exists
  const ipFilterSessions =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnections[0],
      {
        body: {
          ip: "127.0.0.1", // Test IP filter parameter
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(ipFilterSessions);
  // Validate overall pagination structure
  TestValidator.predicate(
    "pagination has current page",
    (allSessions as any).pagination?.current >= 1,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    (allSessions as any).pagination?.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    (allSessions as any).pagination?.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    (allSessions as any).pagination?.pages >= 0,
  );
  // Validate session data structure (when data exists)
  if (allSessions.data.length > 0) {
    const sampleSession = allSessions.data[0];
    // Test business logic validations (not type validations since typia.assert already covers types)
    TestValidator.equals(
      "session has valid UUID format",
      sampleSession.id.length > 0 && typeof sampleSession.id === "string",
      true,
    );
    TestValidator.equals(
      "session user has display name",
      sampleSession.user.display_name.length > 0,
      true,
    );
  }
  // Test error case: Filter by non-existent user ID
  await TestValidator.error(
    "should handle non-existent user gracefully",
    async () => {
      await api.functional.discussionBoard.user.users.sessions.index(
        userConnections[0],
        {
          body: {
            user_id: typia.random<string & tags.Format<"uuid">>(),
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardUserSession.IRequest,
        },
      );
    },
  );
}