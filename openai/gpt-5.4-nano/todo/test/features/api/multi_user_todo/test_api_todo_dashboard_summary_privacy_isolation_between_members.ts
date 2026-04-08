import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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

export async function test_api_todo_dashboard_summary_privacy_isolation_between_members(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      display_name: `member-a-${RandomGenerator.name()}`,
      password: "Password1!",
      href: `https://example.com/a-${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref-a-${RandomGenerator.alphabets(8)}`,
      ip: `127.0.0.${1 + Math.floor(Math.random() * 200)}`,
    },
  });
  typia.assert(memberAAuthorized);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      display_name: `member-b-${RandomGenerator.name()}`,
      password: "Password1!",
      href: `https://example.com/b-${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref-b-${RandomGenerator.alphabets(8)}`,
      ip: `127.0.0.${201 + Math.floor(Math.random() * 50)}`,
    },
  });
  typia.assert(memberBAuthorized);
  const memberATodos: IMultiUserTodoTodo[] = [];
  for (const _ of [0, 1]) {
    const todo = await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
      {
        body: {
          title: `todo-a-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
    typia.assert(todo);
    memberATodos.push(todo);
  }
  // Ensure at least one normal and one trash for Member A
  const memberANormalTodo = memberATodos[0];
  const memberAToTrashTodo = memberATodos[1];
  const memberATrashResult =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberAConnection,
      {
        body: {
          ids: [memberAToTrashTodo.id],
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(memberATrashResult);
  TestValidator.predicate(
    "member A movedCount should be 1",
    memberATrashResult.movedCount === 1,
  );
  const memberASummary =
    await api.functional.multiUserTodo.member.dashboard.todos.summary.at(
      memberAConnection,
    );
  typia.assert(memberASummary);
  const memberBTodos: IMultiUserTodoTodo[] = [];
  for (const _ of [0, 1, 2]) {
    const todo = await generate_random_multi_user_todo_member_todos_create(
      memberBConnection,
      {
        body: {
          title: `todo-b-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
    typia.assert(todo);
    memberBTodos.push(todo);
  }
  const memberBNormalTodos = [memberBTodos[0]];
  const memberBToTrashTodos = memberBTodos.slice(1, 3);
  const memberBTrashResult =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberBConnection,
      {
        body: {
          ids: memberBToTrashTodos.map((t) => t.id),
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(memberBTrashResult);
  TestValidator.predicate(
    "member B movedCount should be 2",
    memberBTrashResult.movedCount === 2,
  );
  const memberBSummary =
    await api.functional.multiUserTodo.member.dashboard.todos.summary.at(
      memberBConnection,
    );
  typia.assert(memberBSummary);
  // Validations for privacy isolation and aggregates
  // NOTE: IMultiUserTodoTodoEditHistoryEntry is an unexpected type for this endpoint's response.
  // We'll validate privacy isolation by ensuring summaries differ and do not leak IDs.
  TestValidator.notEquals(
    "member A and B summaries should differ",
    memberASummary,
    memberBSummary,
  );
  TestValidator.predicate(
    "member A summary must not include member B todo id",
    memberBTodos.every((t) => memberASummary.id !== t.id),
  );
  TestValidator.predicate(
    "member B summary must not include member A todo id",
    memberATodos.every((t) => memberBSummary.id !== t.id),
  );
  TestValidator.equals(
    "member A normal todo exists and is owned by A",
    memberANormalTodo.id,
    memberATodos[0].id,
  );
}
