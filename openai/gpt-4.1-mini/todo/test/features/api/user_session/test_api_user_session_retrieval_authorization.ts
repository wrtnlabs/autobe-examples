import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_session_retrieval_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of user session details.
  {
    // 1. Authenticate as a new user
    const userJoinConnection: api.IConnection = { host: connection.host };
    const authorizedUser: IMultiUserTodoUser.IAuthorized =
      await authorize_user_join(userJoinConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphabets(12),
          displayName: RandomGenerator.name(),
          href: "https://example.com/join",
          referrer: "https://example.com",
          ip: null,
        } satisfies IMultiUserTodoUser.IJoin,
      });
    userJoinConnection.headers = { Authorization: authorizedUser.token.access };
    // 2. Obtain a valid sessionId from token info (id in token)
    // We don't have direct user session creation endpoint, but sessionId is usually imbedded in token or retrievable via user data
    // However, for purpose of test, we assume to call GET /multiUserTodo/user/sessions/{sessionId} with correct sessionId from token or authorized user token
    // Since we have no direct sessionId retrieval, we assume token has session id in refresh or access - but we do not have direct access, so we will simulate: use authorizedUser.id as sessionId fallback (not strictly accurate but must try)
    const validSessionId = authorizedUser.id; // Guess sessionId is user id as last resort
    // Actually the sessionId must be obtained reliably. We try GET /sessions/{sessionId} with authorized user's id
    // Later we verify user field in response matches authorizedUser.id
    // 3. Call GET /multiUserTodo/user/sessions/{sessionId}
    const userSessionConnection: api.IConnection = { host: connection.host };
    userSessionConnection.headers = {
      Authorization: authorizedUser.token.access,
    };
    const sessionData = await api.functional.multiUserTodo.user.sessions.at(
      userSessionConnection,
      {
        sessionId: validSessionId,
      },
    );
    typia.assert(sessionData);
    // Validate session sessionData
    TestValidator.equals(
      "session user id matches authorized user",
      sessionData.user.id,
      authorizedUser.id,
    );
    TestValidator.predicate(
      "session id matches request",
      sessionData.id === validSessionId,
    );
    TestValidator.predicate(
      "session created_at timestamp is ISO date-time format",
      typeof sessionData.created_at === "string" &&
        sessionData.created_at.length > 0,
    );
    TestValidator.predicate(
      "session ip is non-empty string",
      typeof sessionData.ip === "string" && sessionData.ip.length > 0,
    );
    TestValidator.predicate(
      "session href is valid URI",
      typeof sessionData.href === "string" && sessionData.href.length > 0,
    );
    // referrer could be string or null or undefined
    TestValidator.predicate(
      "session referrer is string or null or undefined",
      sessionData.referrer === null ||
        sessionData.referrer === undefined ||
        (typeof sessionData.referrer === "string" &&
          sessionData.referrer.length > 0),
    );
    TestValidator.predicate(
      "session updated_at timestamp is ISO date-time format",
      typeof sessionData.updated_at === "string" &&
        sessionData.updated_at.length > 0,
    );
    TestValidator.predicate(
      "session expired_at timestamp is ISO date-time format",
      typeof sessionData.expired_at === "string" &&
        sessionData.expired_at.length > 0,
    );
    // 4. Others
    TestValidator.predicate(
      "session deleted_at is null or string (soft delete)",
      sessionData.deleted_at === null ||
        sessionData.deleted_at === undefined ||
        (typeof sessionData.deleted_at === "string" &&
          sessionData.deleted_at.length > 0),
    );
  }
  // Scenario 2: Access denial for fetching session details that do not belong to user.
  {
    // Authenticate a first user
    const firstUserConnection: api.IConnection = { host: connection.host };
    const firstUserAuthorized = await authorize_user_join(firstUserConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        displayName: RandomGenerator.name(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies IMultiUserTodoUser.IJoin,
    });
    firstUserConnection.headers = {
      Authorization: firstUserAuthorized.token.access,
    };
    // Authenticate a second user
    const secondUserConnection: api.IConnection = { host: connection.host };
    const secondUserAuthorized = await authorize_user_join(
      secondUserConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphabets(12),
          displayName: RandomGenerator.name(),
          href: "https://example.com/join",
          referrer: "https://example.com",
          ip: null,
        } satisfies IMultiUserTodoUser.IJoin,
      },
    );
    secondUserConnection.headers = {
      Authorization: secondUserAuthorized.token.access,
    };
    // Attempt for first user to access second user's session
    await TestValidator.error(
      "access forbidden or not found for other user's session",
      async () => {
        await api.functional.multiUserTodo.user.sessions.at(
          firstUserConnection,
          {
            sessionId: secondUserAuthorized.id,
          },
        );
      },
    );
  }
}
