import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistory";
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

export async function test_api_todo_edit_history_after_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create initial todo
  const initialTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  // First edit: Modify title
  const firstEditTitle = RandomGenerator.paragraph({ sentences: 2 });
  const firstEdit = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: firstEditTitle,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(firstEdit);
  // Second edit: Modify description
  const secondEditDescription = RandomGenerator.paragraph({ sentences: 4 });
  const secondEdit = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        description: secondEditDescription,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(secondEdit);
  // Third edit: Modify dates
  const thirdEditStartDate = new Date(Date.now() + 172800000).toISOString();
  const thirdEditDueDate = new Date(Date.now() + 259200000).toISOString();
  const thirdEdit = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        start_date: thirdEditStartDate,
        due_date: thirdEditDueDate,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(thirdEdit);
  // Retrieve edit history
  const editHistory =
    await api.functional.multiUserTodo.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: initialTodo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoEditHistory.IRequest,
      },
    );
  typia.assert(editHistory);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    editHistory.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", editHistory.pagination.limit, 10);
  TestValidator.equals("pagination records", editHistory.pagination.records, 3);
  TestValidator.equals("pagination pages", editHistory.pagination.pages, 1);
  // Validate exactly 3 edit history entries (one for each edit)
  TestValidator.equals("edit history entry count", editHistory.data.length, 3);
  // Verify reverse chronological order (most recent first)
  for (let i = 0; i < editHistory.data.length - 1; i++) {
    const current = new Date(editHistory.data[i].created_at);
    const next = new Date(editHistory.data[i + 1].created_at);
    TestValidator.predicate(
      `entry ${i} is not older than entry ${i + 1}`,
      current.getTime() >= next.getTime(),
    );
  }
  // Validate each entry has required fields and correct editor
  editHistory.data.forEach((entry, index) => {
    TestValidator.predicate(`entry ${index} has valid id`, entry.id.length > 0);
    TestValidator.predicate(
      `entry ${index} has created_at timestamp`,
      entry.created_at.length > 0,
    );
    TestValidator.predicate(
      `entry ${index} has member info`,
      entry.member.id.length > 0,
    );
    TestValidator.equals(
      `entry ${index} editor matches authenticated user`,
      entry.member.id,
      memberAuth.id,
    );
    TestValidator.equals(
      `entry ${index} editor email matches`,
      entry.member.email,
      memberAuth.email,
    );
    TestValidator.equals(
      `entry ${index} editor display name matches`,
      entry.member.display_name,
      memberAuth.display_name,
    );
  });
}
