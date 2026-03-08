import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member registration using utility function
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppMemberSession.IJoin;
  const joinResponse = await api.functional.todoApp.auth.member.join(
    connection,
    {
      body: joinInput,
    },
  );
  typia.assert(joinResponse);
  // Create new connection with authorization token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResponse.token.access,
    },
  };
  // Step 2: Member login using utility function
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
    href: "https://example.com/login",
    referrer: "https://example.com/",
    ip: "192.168.1.1",
  } satisfies ITodoAppMemberSession.ILogin;
  const loginResponse = await api.functional.todoApp.auth.member.login(
    memberConnection,
    {
      body: loginInput,
    },
  );
  typia.assert(loginResponse);
  // Step 3: Retrieve session by sessionId
  const retrievedSession = await api.functional.todoApp.member.sessions.at(
    memberConnection,
    {
      sessionId: loginResponse.id,
    },
  );
  typia.assert(retrievedSession);
  // Step 4: Validate session data
  TestValidator.equals(
    "session ID matches",
    retrievedSession.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "access token present",
    typeof retrievedSession.access_token,
    "string",
  );
  TestValidator.equals(
    "refresh token present",
    typeof retrievedSession.refresh_token,
    "string",
  );
  TestValidator.predicate("access expiration is valid date-time", () => {
    try {
      new Date(retrievedSession.access_expires_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("refresh expiration is valid date-time", () => {
    try {
      new Date(retrievedSession.refresh_expires_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals(
    "IP address captured",
    typeof retrievedSession.ip,
    "string",
  );
  TestValidator.equals(
    "user agent captured",
    typeof retrievedSession.user_agent,
    "string",
  );
  TestValidator.predicate("created_at is valid date-time", () => {
    try {
      new Date(retrievedSession.created_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    try {
      new Date(retrievedSession.updated_at);
      return true;
    } catch {
      return false;
    }
  });
}
