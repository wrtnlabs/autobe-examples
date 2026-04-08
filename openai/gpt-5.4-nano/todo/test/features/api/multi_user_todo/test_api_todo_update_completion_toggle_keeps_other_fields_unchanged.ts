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

export async function test_api_todo_update_completion_toggle_keeps_other_fields_unchanged(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that toggling completion keeps all other todo fields unchanged.
   *
   * This contract test creates a member-owned todo with explicit baseline
   * values, then updates the todo by flipping only its completion flag
   * (is_complete). It verifies that the server returns the flipped completion
   * state while preserving title/description/startDate/dueDate byte-for-byte,
   * and that timestamps behave as expected (createdAt unchanged,
   * updatedAt changed).
   *
   * 1) Authenticate as member A.
   * 2) Create a todo with explicit baseline fields and capture its values.
   * 3) Update the todo by toggling only completion.
   * 4) Validate response fields and timestamp semantics.
   */
  // 1) Authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(memberA);
  // 2) Create a todo with explicit baseline fields
  const baselineTitle = RandomGenerator.paragraph({ sentences: 2 });
  const baselineDescription: string | null = typia.random<boolean>()
    ? RandomGenerator.paragraph({ sentences: 3 })
    : null;
  const baselineStartDate: (string & tags.Format<"date-time">) | null =
    typia.random<boolean>()
      ? RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 30).toISOString()
      : null;
  const baselineDueDate: (string & tags.Format<"date-time">) | null =
    typia.random<boolean>()
      ? RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 60).toISOString()
      : null;
  const todoCreateBody = {
    title: baselineTitle,
    description: baselineDescription,
    startDate: baselineStartDate,
    dueDate: baselineDueDate,
  } satisfies IMultiUserTodoTodo.ICreate;
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(createdTodo);
  const baselineTodoId = createdTodo.id;
  const baselineCreatedAt = createdTodo.created_at;
  const baselineUpdatedAt = createdTodo.updated_at;
  const baselineIsComplete = createdTodo.is_complete;
  TestValidator.equals(
    "baseline title matches",
    createdTodo.title,
    baselineTitle,
  );
  TestValidator.equals(
    "baseline description matches",
    createdTodo.description,
    baselineDescription,
  );
  TestValidator.equals(
    "baseline startDate matches",
    createdTodo.start_date,
    baselineStartDate,
  );
  TestValidator.equals(
    "baseline dueDate matches",
    createdTodo.due_date,
    baselineDueDate,
  );
  // 3) Update by toggling completion only
  const toggledIsComplete: boolean = !baselineIsComplete;
  const updateBody = {
    title: baselineTitle,
    description: baselineDescription,
    startDate: baselineStartDate,
    dueDate: baselineDueDate,
    isComplete: toggledIsComplete,
  } satisfies IMultiUserTodoTodo.IUpdate;
  // Ensure updated_at changes on backends with coarse timestamp resolution.
  await new Promise<void>((r) => setTimeout(() => r(), 5));
  const updatedTodo =
    await api.functional.multiUserTodo.member.todos.updateTodo(
      memberAConnection,
      {
        todoId: baselineTodoId,
        body: updateBody,
      },
    );
  typia.assert(updatedTodo);
  // 4) Validate contract
  TestValidator.equals(
    "isComplete toggled",
    updatedTodo.is_complete,
    toggledIsComplete,
  );
  TestValidator.equals("title unchanged", updatedTodo.title, baselineTitle);
  TestValidator.equals(
    "description unchanged",
    updatedTodo.description,
    baselineDescription,
  );
  TestValidator.equals(
    "startDate unchanged",
    updatedTodo.start_date,
    baselineStartDate,
  );
  TestValidator.equals(
    "dueDate unchanged",
    updatedTodo.due_date,
    baselineDueDate,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updatedTodo.created_at,
    baselineCreatedAt,
  );
  TestValidator.notEquals(
    "updatedAt changed",
    updatedTodo.updated_at,
    baselineUpdatedAt,
  );
}
