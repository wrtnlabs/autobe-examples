import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
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

export async function test_api_member_session_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: typia.random<ITodoAppMember.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Create new connection for subsequent API calls using the token
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = { Authorization: authorized.token.access };
  // 3. Retrieve member's sessions list to obtain sessionId
  const sessionsList = await api.functional.todoApp.member.sessions.index(
    authConnection,
    {
      body: typia.random<ITodoAppMemberSession.IRequest>(),
    },
  );
  typia.assert(sessionsList);
  // Extract the first session ID
  const sessionId = sessionsList.data[0].id;
  TestValidator.notEquals(
    "should have at least one session",
    sessionId,
    undefined,
  );
  // 4. Retrieve the specific session details
  const session = await api.functional.todoApp.member.sessions.at(
    authConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session details
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.equals("member id matches", session.member.id, authorized.id);
  TestValidator.equals("ip is present", session.ip.length > 0, true);
  TestValidator.equals("href is present", session.href.length > 0, true);
  TestValidator.equals(
    "referrer is present",
    session.referrer.length > 0,
    true,
  );
  // Validate timestamp formats
  const createdDate = new Date(session.createdAt);
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(createdDate.getTime()),
  );
  const expiredDate = new Date(session.expiredAt);
  TestValidator.predicate(
    "expiredAt is valid date",
    !isNaN(expiredDate.getTime()),
  );
  // Validate expiration is after creation
  TestValidator.predicate(
    "expiredAt is after createdAt",
    expiredDate.getTime() > createdDate.getTime(),
  );
}
