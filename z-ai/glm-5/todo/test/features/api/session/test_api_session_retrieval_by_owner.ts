import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppMemberSession";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account with session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IPrivateTodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. List all sessions to get a valid sessionId
  const sessionList = await api.functional.privateTodoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IPrivateTodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // Verify at least one session exists
  TestValidator.predicate(
    "session exists after join",
    sessionList.data.length > 0,
  );
  // 3. Retrieve the specific session
  const sessionId = sessionList.data[0].id;
  const session = await api.functional.privateTodoApp.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate business logic
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.equals("member id matches", session.member.id, member.id);
  TestValidator.predicate(
    "created_at is before expired_at",
    new Date(session.created_at) < new Date(session.expired_at),
  );
}
