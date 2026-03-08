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

export async function test_api_member_session_retrieval_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate emails for both members
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  // Step 2: Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberARegistered = await api.functional.todoApp.auth.member.join(
    memberAConnection,
    {
      body: {
        email: memberAEmail,
        password: "1234",
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(memberARegistered);
  // Step 3: Register Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBRegistered = await api.functional.todoApp.auth.member.join(
    memberBConnection,
    {
      body: {
        email: memberBEmail,
        password: "1234",
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(memberBRegistered);
  // Step 4: Login Member A
  const memberALoginSession = await api.functional.todoApp.auth.member.login(
    memberAConnection,
    {
      body: {
        email: memberAEmail,
        password: "1234",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ITodoAppMemberSession.ILogin,
    },
  );
  typia.assert(memberALoginSession);
  // Step 5: Login Member B
  const memberBLoginSession = await api.functional.todoApp.auth.member.login(
    memberBConnection,
    {
      body: {
        email: memberBEmail,
        password: "1234",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ITodoAppMemberSession.ILogin,
    },
  );
  typia.assert(memberBLoginSession);
  // Step 6: Member A attempts to retrieve Member B's session (should fail)
  const sessionId = memberBLoginSession.id;
  let errorCaught = false;
  try {
    await api.functional.todoApp.member.sessions.at(memberAConnection, {
      sessionId,
    });
  } catch (error) {
    errorCaught = true;
    if (!(error instanceof api.HttpError)) {
      throw error;
    }
    // Verify proper error status code (403 Forbidden or 404 Not Found)
    TestValidator.equals(
      "error status is 403 or 404",
      [403, 404].includes(error.status),
      true,
    );
  }
  TestValidator.predicate("access denied error was thrown", () => errorCaught);
}
