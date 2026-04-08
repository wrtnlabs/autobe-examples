import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_trash_list_private_ownership(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that trashed todos remain private to each authenticated member.
   *
   * This scenario validates the privacy boundary of the trash list endpoint by creating two distinct members and confirming that the second member's trash listing never exposes any todo from the first member's account.
   *
   * 1. Register the first member and create a private todo.
   * 2. Register a second member with a separate connection.
   * 3. Query the second member's trash list.
   * 4. Confirm the returned trash page is empty and contains no data from the first member.
   */
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoin = await authorize_member_join(memberAConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: "1234!@#$",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAJoin);
  const memberATodo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(memberATodo);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBJoin = await authorize_member_join(memberBConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: "1234!@#$",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberBJoin);
  const memberBTrash = await api.functional.todoApp.member.todos.trash.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBTrash);
  TestValidator.equals(
    "second member trash list should be empty",
    memberBTrash.data.length,
    0,
  );
  TestValidator.equals(
    "trash list pagination should report page 1",
    memberBTrash.pagination.current,
    1,
  );
  TestValidator.equals(
    "trash list pagination should respect requested limit",
    memberBTrash.pagination.limit,
    10,
  );
  TestValidator.equals(
    "trash list should not reveal the first member todo",
    ArrayUtil.has(memberBTrash.data, (todo) => todo.id === memberATodo.id),
    false,
  );
}
