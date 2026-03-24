import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_member_members_list_scoped_by_auth_session(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  const authenticatedMemberId = auth.id;
  const authenticatedMemberEmail = auth.email;
  // 2) Create at least one todo owned by the authenticated member
  const ownedTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(ownedTodo);
  // 3) Create another authenticated member with a todo to detect leakage
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherAuth = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(otherAuth);
  await generate_random_todo_app_member_todos_create(otherMemberConnection, {
    body: {
      title: RandomGenerator.name(),
      description: null,
      start_date: null,
      due_date: null,
    } satisfies ITodoAppTodo.ICreate,
  });
  // 4) Call PATCH /todoApp/member/members as authenticated member
  const requestBody: ITodoAppMember.IRequest = {
    page: 1,
    limit: 10,
    completion_status: false,
    search: undefined,
    start_date: null,
    due_date: null,
    deleted_in_trash: false,
  };
  const page1 = await api.functional.todoApp.member.members.index(
    memberConnection,
    { body: requestBody },
  );
  typia.assert(page1);
  TestValidator.equals("pagination current", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "has at least one member summary",
    () => page1.data.length >= 1,
  );
  const returnedIds1 = page1.data.map((x) => x.id);
  TestValidator.predicate("authenticated member id is included", () =>
    returnedIds1.includes(authenticatedMemberId),
  );
  const returnedEmails1 = page1.data.map((x) => x.email);
  TestValidator.predicate(
    "no other member email is leaked",
    () => !returnedEmails1.includes(otherAuth.email),
  );
  // 5) Re-call with the same input and ensure consistency
  const page2 = await api.functional.todoApp.member.members.index(
    memberConnection,
    { body: requestBody },
  );
  typia.assert(page2);
  TestValidator.equals(
    "pagination current stable",
    page2.pagination.current,
    page1.pagination.current,
  );
  TestValidator.equals(
    "pagination limit stable",
    page2.pagination.limit,
    page1.pagination.limit,
  );
  TestValidator.equals(
    "pagination records stable",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "pagination pages stable",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  const returnedIds2 = page2.data.map((x) => x.id);
  TestValidator.equals(
    "returned ids stable",
    JSON.stringify(returnedIds2),
    JSON.stringify(returnedIds1),
  );
  // 6) Authorization failure sub-case: call without authenticated session
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated member list should fail",
    [401, 403],
    async () => {
      await api.functional.todoApp.member.members.index(unauthConnection, {
        body: requestBody,
      });
    },
  );
}
