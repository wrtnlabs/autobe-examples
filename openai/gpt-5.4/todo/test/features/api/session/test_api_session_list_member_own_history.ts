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

export async function test_api_session_list_member_own_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
    href: `https://example.com/todo/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
    ip: "203.0.113.10",
  } satisfies ITodoAppMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const defaultPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultPage);
  const pagedRequest = {
    page: 1,
    limit: 10,
  } satisfies ITodoAppMemberSession.IRequest;
  const pagedPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: pagedRequest,
    },
  );
  typia.assert(pagedPage);
  TestValidator.predicate(
    "default page current is positive",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default page limit is non-negative",
    defaultPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "default page records cover returned data",
    defaultPage.pagination.records >= defaultPage.data.length,
  );
  TestValidator.predicate(
    "default page pages is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "paged page current is positive",
    pagedPage.pagination.current >= 1,
  );
  TestValidator.equals(
    "paged page current matches request",
    pagedPage.pagination.current,
    pagedRequest.page,
  );
  TestValidator.predicate(
    "paged page limit is non-negative",
    pagedPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "paged page records cover returned data",
    pagedPage.pagination.records >= pagedPage.data.length,
  );
  TestValidator.predicate(
    "paged page pages is non-negative",
    pagedPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "member has at least one session",
    defaultPage.data.length > 0,
  );
  const createdSession = defaultPage.data.find(
    (session) =>
      session.ip === joinBody.ip &&
      session.href === joinBody.href &&
      session.referrer === joinBody.referrer,
  );
  TestValidator.predicate(
    "created session is listed for the authenticated member",
    createdSession !== undefined,
  );
  for (const session of defaultPage.data) {
    TestValidator.predicate(
      "session expiration is not earlier than creation",
      new Date(session.expired_at).getTime() >=
        new Date(session.created_at).getTime(),
    );
  }
  for (let i = 1; i < defaultPage.data.length; ++i) {
    const previous = defaultPage.data[i - 1];
    const current = defaultPage.data[i];
    TestValidator.predicate(
      "default order is newest first",
      new Date(previous.created_at).getTime() >=
        new Date(current.created_at).getTime(),
    );
  }
  const repeatedCreatedSession = pagedPage.data.find(
    (session) =>
      createdSession !== undefined && session.id === createdSession.id,
  );
  TestValidator.predicate(
    "repeated listing still contains created session",
    repeatedCreatedSession !== undefined,
  );
  TestValidator.equals(
    "session listing is read-only for record count",
    pagedPage.pagination.records,
    defaultPage.pagination.records,
  );
}
