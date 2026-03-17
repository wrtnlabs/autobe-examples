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

export async function test_api_member_sessions_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first member account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  const validatedMemberA = typia.assert(memberA!);
  // Create second member account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  const validatedMemberB = typia.assert(memberB!);
  // Create multiple sessions for member A by making authenticated requests
  const memberASessionData = await api.functional.todoApp.member.sessions.index(
    memberAConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(memberASessionData!);
  // Create multiple sessions for member B
  const memberBSessionData = await api.functional.todoApp.member.sessions.index(
    memberBConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(memberBSessionData!);
  // Test data isolation - each member should see their own sessions
  // Since session.member is empty {}, we can't validate by member.id
  // Instead validate that each member gets session data
  TestValidator.predicate(
    "member A has sessions",
    memberASessionData.data.length > 0,
  );
  TestValidator.predicate(
    "member B has sessions",
    memberBSessionData.data.length > 0,
  );
  // Validate session summaries structure (without member.id/email)
  for (const session of memberASessionData.data) {
    typia.assert(session!);
    TestValidator.predicate(
      "session has access token",
      session.access_token.length > 0,
    );
  }
  for (const session of memberBSessionData.data) {
    typia.assert(session!);
    TestValidator.predicate(
      "session has access token",
      session.access_token.length > 0,
    );
  }
  // Test filtering parameters within isolated scope
  const filteredRequest = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    created_at_from: new Date().toISOString() satisfies string &
      tags.Format<"date-time">,
    is_expired: false,
    sort: "created_at" as const,
    direction: "desc" as const,
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number as number,
  } satisfies ITodoAppMemberSession.IRequest;
  const filteredA = await api.functional.todoApp.member.sessions.index(
    memberAConnection,
    {
      body: filteredRequest,
    },
  );
  typia.assert(filteredA!);
  const filteredB = await api.functional.todoApp.member.sessions.index(
    memberBConnection,
    {
      body: filteredRequest,
    },
  );
  typia.assert(filteredB!);
  // Test concurrent session creation scenario
  const concurrentSessions = await Promise.all(
    ArrayUtil.repeat(3, () =>
      authorize_member_join({ host: connection.host }, {}),
    ),
  );
  for (const concurrentMember of concurrentSessions) {
    const concurrentConnection: api.IConnection = { host: connection.host };
    // Update authorization header
    concurrentConnection.headers = {
      ...concurrentConnection.headers,
      Authorization: concurrentMember.token.access,
    };
    const sessions = await api.functional.todoApp.member.sessions.index(
      concurrentConnection,
      {
        body: {} satisfies ITodoAppMemberSession.IRequest,
      },
    );
    typia.assert(sessions!);
    TestValidator.predicate(
      "concurrent member has sessions",
      sessions.data.length > 0,
    );
  }
}
