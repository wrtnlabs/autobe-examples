import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_get_owned_member_session(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/todo-app/dashboard",
    referrer: "https://example.com/todo-app/sign-up",
    ip: "203.0.113.10",
  } satisfies ITodoAppMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const sessionId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(authorized.token.refresh);
  const session = await api.functional.todoApp.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  TestValidator.equals(
    "session id matches requested session",
    session.id,
    sessionId,
  );
  TestValidator.equals(
    "session ip matches join context",
    session.ip,
    joinBody.ip,
  );
  TestValidator.equals(
    "session href matches join context",
    session.href,
    joinBody.href,
  );
  TestValidator.equals(
    "session referrer matches join context",
    session.referrer,
    joinBody.referrer,
  );
  const expectedMember = {
    id: authorized.id,
    email: authorized.email,
    email_verified: authorized.email_verified,
    created_at: authorized.created_at,
    updated_at: authorized.updated_at,
    deleted_at: authorized.deleted_at,
  } satisfies ITodoAppMember.ISummary;
  TestValidator.equals(
    "nested member summary matches authorized member",
    session.member,
    expectedMember,
  );
  const secondRead = await api.functional.todoApp.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(secondRead);
  TestValidator.equals(
    "second read preserves session creation time",
    secondRead.created_at,
    session.created_at,
  );
  TestValidator.equals(
    "second read preserves session expiration time",
    secondRead.expired_at,
    session.expired_at,
  );
  TestValidator.equals(
    "retrieving session is observational only",
    secondRead,
    session,
  );
}
