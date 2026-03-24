import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function test_api_member_todos_privacy_no_cross_user_visibility(
  connection: api.IConnection,
): Promise<void> {
  // Member #1 auth
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Authorized = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1Authorized);
  const member1Todo1 = await generate_random_todo_app_member_todos_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.name(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(member1Todo1);
  // Member #2 auth
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member2Authorized);
  const member2Todo1 = await generate_random_todo_app_member_todos_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.name(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(member2Todo1);
  // Back to member #1: list with created_at desc
  const index1 = await api.functional.todoApp.member.todos.index(
    member1Connection,
    {
      body: {
        completionStatusFilter: "all",
        sortBy: "created_at",
        sortDirection: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(index1);
  TestValidator.equals(
    "member1 pagination records",
    index1.pagination.records,
    1,
  );
  TestValidator.equals(
    "member1 pagination current page",
    index1.pagination.current,
    1,
  );
  const member1Ids = new Set<string>([member1Todo1.id]);
  const actualIds = index1.data.map((t) => t.id);
  TestValidator.predicate(
    "response contains only member1 todo ids",
    () =>
      actualIds.every((id) => member1Ids.has(id)) &&
      !actualIds.includes(member2Todo1.id),
  );
  TestValidator.equals("member1 todo count returned", actualIds.length, 1);
  // Member #1 again: list with due_date sorting
  const index2 = await api.functional.todoApp.member.todos.index(
    member1Connection,
    {
      body: {
        completionStatusFilter: "all",
        sortBy: "due_date",
        sortDirection: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(index2);
  TestValidator.equals(
    "member1 pagination records with due_date",
    index2.pagination.records,
    1,
  );
  const actualIds2 = index2.data.map((t) => t.id);
  TestValidator.predicate(
    "due_date response contains only member1 todo ids",
    () =>
      actualIds2.every((id) => member1Ids.has(id)) &&
      !actualIds2.includes(member2Todo1.id),
  );
}
