import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoCompletionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoCompletionStatus";
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

export async function test_api_todo_completion_toggle_multiple_todos(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Create three distinct todos
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo3);
  // Verify initial state - all todos should be incomplete
  TestValidator.equals("todo1 initial state", todo1.is_completed, false);
  TestValidator.equals("todo2 initial state", todo2.is_completed, false);
  TestValidator.equals("todo3 initial state", todo3.is_completed, false);
  // The completion status toggle endpoint appears to require pagination parameters
  // but the actual todo targeting mechanism is unclear from the provided DTOs.
  // Since the IRequest type only has page/limit properties, we'll use the endpoint
  // as defined and test its behavior with the current member's todos.
  // Toggle completion status - this will affect the member's todos
  const toggleResponse =
    await api.functional.multiUserTodo.member.completion.status(
      memberConnection,
      {
        body: {
          page: null,
          limit: null,
        } satisfies IMultiUserTodoTodoCompletionStatus.IRequest,
      },
    );
  typia.assert(toggleResponse);
  // Since the exact behavior is unclear, we'll validate the response structure
  // and that it represents a valid todo entity
  TestValidator.predicate(
    "response has valid todo structure",
    typeof toggleResponse.id === "string" &&
      typeof toggleResponse.title === "string" &&
      typeof toggleResponse.is_completed === "boolean",
  );
  // Test that the operation is idempotent - calling again should toggle the status
  const secondToggleResponse =
    await api.functional.multiUserTodo.member.completion.status(
      memberConnection,
      {
        body: {
          page: null,
          limit: null,
        } satisfies IMultiUserTodoTodoCompletionStatus.IRequest,
      },
    );
  typia.assert(secondToggleResponse);
  // Verify the status changed between calls
  TestValidator.notEquals(
    "completion status toggled",
    toggleResponse.is_completed,
    secondToggleResponse.is_completed,
  );
  // Verify the same todo was affected (same ID)
  TestValidator.equals(
    "same todo affected",
    toggleResponse.id,
    secondToggleResponse.id,
  );
  // Test with specific pagination to see if it affects which todo is toggled
  const pagedToggleResponse =
    await api.functional.multiUserTodo.member.completion.status(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodoCompletionStatus.IRequest,
      },
    );
  typia.assert(pagedToggleResponse);
  // The completion toggle should work regardless of pagination parameters
  TestValidator.predicate(
    "paged toggle returns valid todo",
    typeof pagedToggleResponse.is_completed === "boolean",
  );
}
