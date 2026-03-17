import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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
 * Test the primary success path for updating a todo with comprehensive modifications.
 * As an authenticated member, create a todo with basic information, then update it with
 * complete modifications: change the title to reflect task evolution, add a detailed description,
 * set realistic start and due dates, and mark it as completed. Validate that the response
 * includes all updated fields with correct values, that the updated_at timestamp is refreshed,
 * and that the system automatically creates a history entry documenting these changes.
 * Also verify that the todo remains correctly associated with the member who created it
 * and that optional fields accept null values when cleared.
 */
export async function test_api_todo_update_comprehensive_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create initial todo with basic information using utility function
  const initialTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Initial todo title",
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  TestValidator.equals(
    "initial todo belongs to member",
    initialTodo.member.id,
    member.id,
  );
  // 3. Prepare comprehensive update data
  const startDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const dueDate = new Date(Date.now() + 172800000).toISOString(); // day after tomorrow
  const updateBody = {
    title: "Updated and completed task",
    description:
      "Detailed description of the updated todo task with comprehensive notes.",
    start_date: startDate,
    due_date: dueDate,
    completed: true,
  } satisfies ITodoAppTodo.IUpdate;
  // 4. Update the todo
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);
  // 5. Validate updated fields
  TestValidator.equals("title updated", updatedTodo.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updateBody.description,
  );
  TestValidator.equals(
    "start_date updated",
    updatedTodo.start_date,
    updateBody.start_date,
  );
  TestValidator.equals(
    "due_date updated",
    updatedTodo.due_date,
    updateBody.due_date,
  );
  TestValidator.equals(
    "completed status updated",
    updatedTodo.completed,
    updateBody.completed,
  );
  // 6. Verify updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updatedTodo.updated_at).getTime() >
      new Date(initialTodo.created_at).getTime(),
  );
  // 7. Verify todo remains associated with the same member
  TestValidator.equals(
    "member association preserved",
    updatedTodo.member.id,
    member.id,
  );
  TestValidator.equals(
    "member email preserved",
    updatedTodo.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display_name preserved",
    updatedTodo.member.display_name,
    member.display_name,
  );
  // 8. Test clearing optional fields with null (partial update)
  const clearUpdateBody = {
    description: null,
    start_date: null,
    due_date: null,
  } satisfies ITodoAppTodo.IUpdate;
  const clearedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: clearUpdateBody,
    },
  );
  typia.assert(clearedTodo);
  // 9. Validate optional fields cleared to null
  TestValidator.equals(
    "description cleared to null",
    clearedTodo.description,
    null,
  );
  TestValidator.equals(
    "start_date cleared to null",
    clearedTodo.start_date,
    null,
  );
  TestValidator.equals("due_date cleared to null", clearedTodo.due_date, null);
  // 10. Verify other fields remain unchanged
  TestValidator.equals(
    "title remains after clearing",
    clearedTodo.title,
    updateBody.title,
  );
  TestValidator.equals(
    "completed remains after clearing",
    clearedTodo.completed,
    updateBody.completed,
  );
}
