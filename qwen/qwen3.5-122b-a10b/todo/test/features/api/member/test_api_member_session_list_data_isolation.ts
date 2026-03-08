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

export async function test_api_member_session_list_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A account with stored password
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAJoinConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberAPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  // 2. Create Member B account with stored password
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBJoinConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberBPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  // 3. Member A creates multiple sessions by logging in from different IPs
  const memberAConnection1: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAConnection1, {
    body: {
      email: memberAAuthorized.email,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  const memberAConnection2: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAConnection2, {
    body: {
      email: memberAAuthorized.email,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  // 4. Member B creates multiple sessions by logging in from different IPs
  const memberBConnection1: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBConnection1, {
    body: {
      email: memberBAuthorized.email,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  const memberBConnection2: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBConnection2, {
    body: {
      email: memberBAuthorized.email,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  // 5. Member A retrieves their session list
  const memberASessions = await api.functional.todoApp.member.sessions.index(
    memberAConnection1,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(memberASessions);
  // 6. Member B retrieves their session list
  const memberBSessions = await api.functional.todoApp.member.sessions.index(
    memberBConnection1,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(memberBSessions);
  // 7. Validate data isolation - Member A should only see their own sessions
  TestValidator.equals(
    "Member A session count should be 2",
    memberASessions.data.length,
    2,
  );
  TestValidator.equals(
    "Member B session count should be 2",
    memberBSessions.data.length,
    2,
  );
  // 8. Verify session IDs are different between members
  const memberASessionIds = memberASessions.data.map((s) => s.id);
  const memberBSessionIds = memberBSessions.data.map((s) => s.id);
  TestValidator.predicate(
    "Member A and B sessions should be completely different",
    memberASessionIds.every((id) => !memberBSessionIds.includes(id)),
  );
}
