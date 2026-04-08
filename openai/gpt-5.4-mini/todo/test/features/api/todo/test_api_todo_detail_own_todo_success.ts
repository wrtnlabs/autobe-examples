import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Verifies that a signed-in member can read the detail view of an owned todo.
 *
 * This test covers the private todo detail workflow for the current member.
 * It creates a member session, seeds a todo owned by that session, retrieves
 * the todo by UUID, and checks that the response matches the created record.
 *
 * 1. Register an authenticated member session.
 * 2. Create a private todo with title, description, and schedule fields.
 * 3. Read the todo detail by todoId using the same member connection.
 * 4. Validate the returned payload matches the stored todo data and ownership.
 */
export async function test_api_todo_detail_own_todo_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ITodoAppMember.IJoin,
  });
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description,
        startDate,
        dueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  const detail = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: created.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("todo id should match", detail.id, created.id);
  TestValidator.equals("todo title should match", detail.title, created.title);
  TestValidator.equals(
    "todo description should match",
    detail.description,
    created.description,
  );
  TestValidator.equals(
    "todo start date should match",
    detail.startDate,
    created.startDate,
  );
  TestValidator.equals(
    "todo due date should match",
    detail.dueDate,
    created.dueDate,
  );
  TestValidator.equals(
    "todo completion state should match",
    detail.isCompleted,
    created.isCompleted,
  );
  TestValidator.equals(
    "todo owner should match",
    detail.member,
    created.member,
  );
  TestValidator.equals(
    "todo history marker should match",
    detail.todoEditHistories,
    created.todoEditHistories,
  );
  TestValidator.equals(
    "todo created at should match",
    detail.createdAt,
    created.createdAt,
  );
  TestValidator.equals(
    "todo updated at should match",
    detail.updatedAt,
    created.updatedAt,
  );
  TestValidator.equals(
    "todo deleted at should match",
    detail.deletedAt,
    created.deletedAt,
  );
}
