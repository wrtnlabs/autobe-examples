import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test data isolation enforcement for todo lists.
 *
 * This test validates that members can only access their own todos.
 * 1. memberA is created and joins
 * 2. memberB is created and joins
 * 3. memberA creates several todos
 * 4. memberB queries todo list
 * 5. Verify memberB sees empty list (no access to memberA's todos)
 */
export async function test_api_todo_list_data_isolation_between_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create memberA and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  // 2. Create memberB and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  // 3. memberA creates several todos
  const todoCount = 3;
  await ArrayUtil.asyncRepeat(todoCount, async () => {
    await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  });
  // 4. memberB queries todo list - should be empty
  const memberBTodos: IPageIMultiUserTodoTodo.ISummary =
    await api.functional.multiUserTodo.member.todos.index(memberBConnection, {
      body: {} satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(memberBTodos);
  // 5. Verify data isolation - memberB should see no todos
  TestValidator.equals(
    "memberB should see empty todo list",
    memberBTodos.data.length,
    0,
  );
  TestValidator.equals(
    "memberB pagination should show 0 records",
    memberBTodos.pagination.records,
    0,
  );
  // 6. Verify memberA can still see their own todos (sanity check)
  const memberATodos: IPageIMultiUserTodoTodo.ISummary =
    await api.functional.multiUserTodo.member.todos.index(memberAConnection, {
      body: {} satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(memberATodos);
  TestValidator.equals(
    "memberA should see their created todos",
    memberATodos.data.length,
    todoCount,
  );
}