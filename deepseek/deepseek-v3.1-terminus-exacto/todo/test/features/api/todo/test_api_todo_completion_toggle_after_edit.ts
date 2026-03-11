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

/**
 * Test completion status toggle works correctly after todo has been edited
 * (title, description, dates updated). Create todo, then edit it (update title
 * or description), then toggle completion. Verify that the toggle operation
 * works correctly on edited todos and that edit history captures both property
 * changes and completion status changes separately. Test scenarios: todo edited
 * before completion, todo completed then edited, todo edited after toggling
 * back to incomplete. Validate that completion status is preserved during edit
 * operations and that toggling works regardless of edit history.
 */
export async function test_api_todo_completion_toggle_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/todos",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create initial todo
  const initialTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  TestValidator.equals(
    "todo initially incomplete",
    initialTodo.is_completed,
    false,
  );
  // 3. Edit todo (update title and description)
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const editedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(editedTodo);
  TestValidator.equals("title updated", editedTodo.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    editedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "completion preserved after edit",
    editedTodo.is_completed,
    false,
  );
  // 4. Toggle completion after edit (incomplete → complete)
  const completedTodo =
    await api.functional.multiUserTodo.member.completion.status(
      memberConnection,
      {
        body: {} satisfies IMultiUserTodoTodoCompletionStatus.IRequest,
      },
    );
  typia.assert(completedTodo);
  TestValidator.equals(
    "todo marked complete",
    completedTodo.is_completed,
    true,
  );
  TestValidator.equals(
    "title unchanged after completion",
    completedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description unchanged after completion",
    completedTodo.description,
    updatedDescription,
  );
  // 5. Edit todo while it's complete
  const secondUpdatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const secondUpdatedDescription = RandomGenerator.content({ paragraphs: 1 });
  const editedWhileComplete =
    await api.functional.multiUserTodo.member.todos.update(memberConnection, {
      todoId: completedTodo.id,
      body: {
        title: secondUpdatedTitle,
        description: secondUpdatedDescription,
      } satisfies IMultiUserTodoTodo.IUpdate,
    });
  typia.assert(editedWhileComplete);
  TestValidator.equals(
    "title updated while complete",
    editedWhileComplete.title,
    secondUpdatedTitle,
  );
  TestValidator.equals(
    "description updated while complete",
    editedWhileComplete.description,
    secondUpdatedDescription,
  );
  TestValidator.equals(
    "completion status preserved during edit",
    editedWhileComplete.is_completed,
    true,
  );
  // 6. Toggle back to incomplete
  const incompleteAgainTodo =
    await api.functional.multiUserTodo.member.completion.status(
      memberConnection,
      {
        body: {} satisfies IMultiUserTodoTodoCompletionStatus.IRequest,
      },
    );
  typia.assert(incompleteAgainTodo);
  TestValidator.equals(
    "todo marked incomplete again",
    incompleteAgainTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "title unchanged after toggling back",
    incompleteAgainTodo.title,
    secondUpdatedTitle,
  );
  TestValidator.equals(
    "description unchanged after toggling back",
    incompleteAgainTodo.description,
    secondUpdatedDescription,
  );
  // 7. Edit todo while incomplete again
  const finalUpdatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const finalEdit = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: incompleteAgainTodo.id,
      body: {
        title: finalUpdatedTitle,
        description: null, // Clear description
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(finalEdit);
  TestValidator.equals(
    "final title update",
    finalEdit.title,
    finalUpdatedTitle,
  );
  TestValidator.equals("description cleared", finalEdit.description, null);
  TestValidator.equals(
    "completion stays incomplete after final edit",
    finalEdit.is_completed,
    false,
  );
  // 8. Final toggle to complete
  const finalCompletedTodo =
    await api.functional.multiUserTodo.member.completion.status(
      memberConnection,
      {
        body: {} satisfies IMultiUserTodoTodoCompletionStatus.IRequest,
      },
    );
  typia.assert(finalCompletedTodo);
  TestValidator.equals(
    "final completion status",
    finalCompletedTodo.is_completed,
    true,
  );
  TestValidator.equals(
    "final title unchanged",
    finalCompletedTodo.title,
    finalUpdatedTitle,
  );
  TestValidator.equals(
    "final description unchanged",
    finalCompletedTodo.description,
    null,
  );
  // Summary validation
  TestValidator.notEquals(
    "title changed from original",
    initialTodo.title,
    finalCompletedTodo.title,
  );
  TestValidator.notEquals(
    "description changed from original",
    initialTodo.description,
    finalCompletedTodo.description,
  );
}
