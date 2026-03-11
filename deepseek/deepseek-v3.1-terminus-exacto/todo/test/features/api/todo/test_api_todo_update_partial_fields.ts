import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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
 * Test partial update of todo fields where only specific properties are
 * modified while others remain unchanged.
 */
export async function test_api_todo_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Create initial todo with complete data
  const originalStartDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const originalDueDate = new Date(Date.now() + 86400000 * 7).toISOString(); // next week
  const initialTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: originalStartDate,
        dueDate: originalDueDate,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  // Store original timestamps for comparison
  const originalUpdatedAt = initialTodo.updated_at;
  // 3. Update only title and description fields
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        // Note: start_date and due_date are not provided - should preserve original values
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Validate updated values
  TestValidator.equals(
    "title should be updated",
    updatedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description should be updated",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "start date should remain unchanged",
    updatedTodo.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "due date should remain unchanged",
    updatedTodo.due_date,
    originalDueDate,
  );
  // 5. Validate timestamps
  TestValidator.equals(
    "id should remain unchanged",
    updatedTodo.id,
    initialTodo.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedTodo.created_at,
    initialTodo.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedTodo.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at should be later than created_at",
    new Date(updatedTodo.updated_at) > new Date(updatedTodo.created_at),
  );
  // 6. Validate ownership information
  TestValidator.equals(
    "member.id should match",
    updatedTodo.member.id,
    member.id,
  );
  TestValidator.equals(
    "member.email should match",
    updatedTodo.member.email,
    member.email,
  );
  TestValidator.equals(
    "member.display_name should match",
    updatedTodo.member.display_name,
    member.display_name,
  );
  // 7. Validate other fields remain unchanged
  TestValidator.equals(
    "completion status unchanged",
    updatedTodo.is_completed,
    initialTodo.is_completed,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedTodo.deleted_at,
    initialTodo.deleted_at,
  );
}
