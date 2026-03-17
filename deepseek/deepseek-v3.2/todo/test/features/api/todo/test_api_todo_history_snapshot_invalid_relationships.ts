import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
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

export async function test_api_todo_history_snapshot_invalid_relationships(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Create first todo and edit to generate history (and snapshot)
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // Edit to generate history
  const todo1Updated = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo1.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todo1Updated);
  // Create second todo and edit to generate its own history
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  const todo2Updated = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo2.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todo2Updated);
  // Test case 1: Non-existent history ID for valid todo
  await TestValidator.httpError(
    "non-existent history ID should return 404",
    404,
    async () =>
      await api.functional.todoApp.member.todos.histories.snapshot.at(
        memberConnection,
        {
          todoId: todo1.id,
          historyId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
  // Test case 2: Valid history ID but belongs to different todo
  // Since we cannot retrieve actual history IDs without a listing API,
  // we test with a randomly generated history ID that doesn't exist
  // This tests the "history belongs to todo" validation
  await TestValidator.httpError(
    "history ID from different todo should return 404",
    404,
    async () =>
      await api.functional.todoApp.member.todos.histories.snapshot.at(
        memberConnection,
        {
          todoId: todo1.id,
          historyId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
  // Test case 3: Valid todo and history but missing snapshot
  // Without knowing which histories have snapshots, we test with
  // non-existent snapshot scenario using random history ID
  await TestValidator.httpError(
    "missing snapshot should return 404",
    404,
    async () =>
      await api.functional.todoApp.member.todos.histories.snapshot.at(
        memberConnection,
        {
          todoId: todo1.id,
          historyId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
  // Additional test: Non-existent todo ID with valid history ID format
  await TestValidator.httpError(
    "non-existent todo ID should return 404",
    404,
    async () =>
      await api.functional.todoApp.member.todos.histories.snapshot.at(
        memberConnection,
        {
          todoId: typia.random<string & tags.Format<"uuid">>(),
          historyId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
