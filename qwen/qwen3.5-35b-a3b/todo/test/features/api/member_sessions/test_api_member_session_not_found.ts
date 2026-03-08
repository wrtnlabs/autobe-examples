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

export async function test_api_member_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const member: ITodoAppMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: typia.random<ITodoAppMember.IJoin>(),
    },
  );
  typia.assert(member);
  // 2. Create a new connection for the authenticated member with the token
  const memberSessionConnection: api.IConnection = { host: connection.host };
  memberSessionConnection.headers = {
    ...connection.headers,
    Authorization: member.token.access,
  };
  // 3. Generate a random UUID that doesn't exist in the database
  const nonExistentSessionId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to fetch the non-existent session
  await TestValidator.httpError("session not found", 404, async () => {
    await api.functional.todoApp.member.sessions.at(memberSessionConnection, {
      sessionId: nonExistentSessionId,
    });
  });
}
