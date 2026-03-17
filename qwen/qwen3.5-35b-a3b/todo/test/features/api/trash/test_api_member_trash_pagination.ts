import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

/**
 * Test the trash listing endpoint with pagination.
 * Validates pagination parameters and returned data structure for deleted todos.
 */
export async function test_api_member_trash_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create 15 todos and delete them to populate trash
  const todoIds: string[] = [];
  for (const idx of ArrayUtil.repeat(15, (i) => i)) {
    const todo = await api.functional.multiUserTodoApp.member.todos.create(
      memberConnection,
      {
        body: {
          title: `Test Todo ${idx + 1}`,
          description: `Description for todo ${idx + 1}`,
          startDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        } satisfies IMultiUserTodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todoIds.push(todo.id);
  }
  // Soft delete all todos to populate trash
  for (const todoId of todoIds) {
    await api.functional.multiUserTodoApp.member.todos.erase(memberConnection, {
      todoId,
    });
  }
  // 3. Retrieve trash with pagination (page=2, limit=5)
  const trashResponse =
    await api.functional.multiUserTodoApp.member.todos.trash.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IMultiUserTodoAppTodo.IRequest,
      },
    );
  typia.assert(trashResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    trashResponse.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", trashResponse.pagination.limit, 5);
  TestValidator.equals(
    "pagination total records",
    trashResponse.pagination.records,
    15,
  );
  TestValidator.equals(
    "pagination total pages",
    trashResponse.pagination.pages,
    3,
  );
  // 5. Validate returned todos
  TestValidator.equals("trash items count", trashResponse.data.length, 5);
  for (const idx in trashResponse.data) {
    const todo = trashResponse.data[idx];
    typia.assert(todo);
    // Validate essential fields
    TestValidator.equals(`todo ${idx} has id`, todo.id !== undefined, true);
    TestValidator.equals(
      `todo ${idx} has title`,
      typeof todo.title === "string" && todo.title.length > 0,
      true,
    );
    TestValidator.equals(
      `todo ${idx} has description`,
      typeof todo.description === "string" || todo.description === null,
      true,
    );
    TestValidator.equals(
      `todo ${idx} has deletedAt`,
      todo.deleted_at !== null,
      true,
    );
    // Verify belongs to authenticated member
    TestValidator.equals(
      `todo ${idx} belongs to member`,
      todo.id,
      member.id,
    );
  }
  // 6. Verify todos are sorted by deletedAt descending
  const deletedAts = trashResponse.data.map((todo) => todo.deleted_at);
  for (let i = 0; i < deletedAts.length - 1; i++) {
    if (deletedAts[i] !== null && deletedAts[i + 1] !== null) {
      TestValidator.predicate(
        "todos sorted by deletedAt descending",
        deletedAts[i]! >= deletedAts[i + 1]!,
      );
    }
  }
}