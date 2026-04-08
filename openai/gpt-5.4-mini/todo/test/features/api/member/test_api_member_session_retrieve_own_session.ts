import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_retrieve_own_session(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const sessionId = authorized.token.access;
  const session = await api.functional.todoApp.member.sessions.at(
    memberConnection,
    {
      sessionId: sessionId as string & tags.Format<"uuid">,
    },
  );
  typia.assert(session);
  TestValidator.equals(
    "session id should match the requested session id",
    session.id,
    sessionId,
  );
  TestValidator.equals(
    "session owner should match authenticated member summary",
    session.member,
    authorized.profile.member,
  );
  TestValidator.equals(
    "session ip should be preserved",
    session.ip,
    session.ip,
  );
  TestValidator.equals(
    "session href should be preserved",
    session.href,
    session.href,
  );
  TestValidator.equals(
    "session referrer should be preserved",
    session.referrer,
    session.referrer,
  );
  TestValidator.equals(
    "session createdAt should be preserved",
    session.createdAt,
    session.createdAt,
  );
  TestValidator.equals(
    "session expiredAt should be preserved",
    session.expiredAt,
    session.expiredAt,
  );
  const repeated = await api.functional.todoApp.member.sessions.at(
    memberConnection,
    {
      sessionId: sessionId as string & tags.Format<"uuid">,
    },
  );
  typia.assert(repeated);
  TestValidator.equals(
    "retrieving the same session should be stable",
    repeated,
    session,
  );
}
