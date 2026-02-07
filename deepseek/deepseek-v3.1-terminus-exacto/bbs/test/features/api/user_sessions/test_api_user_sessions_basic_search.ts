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

export async function test_api_user_sessions_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple user sessions for testing
  const userConnections: api.IConnection[] = ArrayUtil.repeat(5, () => ({
    host: connection.host,
  }));
  const userSessions: IDiscussionBoardUser.IAuthorized[] = [];
  for (const userConnection of userConnections) {
    const session = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(session);
    userSessions.push(session);
  }
  // Use the first user's authenticated connection for session search
  const searchConnection: api.IConnection = {
    host: connection.host,
    headers: { ...userConnections[0].headers },
  };
  // Search sessions with pagination
  const searchResult = await api.functional.discussionBoard.user.sessions.index(
    searchConnection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardUserSession.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 3);
  TestValidator.predicate(
    "total records is at least number of created sessions",
    searchResult.pagination.records >= 5,
  );
  TestValidator.predicate(
    "total pages calculation",
    searchResult.pagination.pages ===
      Math.ceil(
        searchResult.pagination.records / searchResult.pagination.limit,
      ),
  );
  // Validate session data structure
  TestValidator.predicate("has session data", searchResult.data.length > 0);
  // Verify chronological order (newest first)
  if (searchResult.data.length > 1) {
    for (let i = 1; i < searchResult.data.length; i++) {
      const currentSession = new Date(searchResult.data[i].created_at);
      const previousSession = new Date(searchResult.data[i - 1].created_at);
      TestValidator.predicate(
        "sessions ordered newest first",
        currentSession <= previousSession,
      );
    }
  }
  // Verify session summaries contain proper user information
  for (const sessionSummary of searchResult.data) {
    TestValidator.predicate(
      "session has user information",
      sessionSummary.user !== undefined,
    );
    TestValidator.predicate(
      "user has display name",
      sessionSummary.user.display_name.length > 0,
    );
    TestValidator.predicate(
      "user has valid creation timestamp",
      !isNaN(new Date(sessionSummary.user.created_at).getTime()),
    );
  }
}
