import { TestValidator } from "@nestia/e2e";
import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
/**
 * Tests restoration of a soft-deleted todo back to the active state.
 *
 * Validates the complete restore workflow including member authentication, todo creation with optional scheduling dates, soft-deletion to trash, and restoration from trash. Ensures that the restored todo returns to active state with deleted_at cleared to null, all original data (title, description, start_date, due_date, is_completed) is preserved, and the updated_at timestamp is refreshed to reflect the restoration time.
 *
 * The test follows the natural business flow: member registration, todo creation, soft-deletion to trash, and restoration. Special attention is given to verifying that the deleted_at field transitions from a timestamp (trash state) to null (active state) and that the updated_at timestamp is refreshed during restoration while preserving all other todo fields.
 *
 * 1. Member registers and authenticates via authorization utility.
 * 2. Member creates a todo with title and optional description, start_date, and due_date.
 * 3. Member soft-deletes the todo (moves to trash with deleted_at set to timestamp).
 * 4. Member restores the todo from trash using restore endpoint.
 * 5. Validates restored todo is in active state (deleted_at is null).
 * 6. Validates all original data is preserved during restoration.
 * 7. Validates updated_at timestamp is refreshed to reflect restoration time.
 */
export async function test_api_todo_restore_from_trash(connection: api.IConnection): Promise<void> {
    // 1. Member authentication and session establishment
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth: ITodoAppMember.IAuthorized = await authorize_member_join(memberConnection, { body: {} });
    typia.assert(memberAuth);
    // 2. Create a todo with title and optional scheduling fields
    const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(memberConnection, {
        body: {},
    });
    typia.assert(todo);
    // 3. Preserve original data for validation after restore
    const originalTitle: string = todo.title;
    const originalDescription: string | null = todo.description;
    const originalStartDate: (string & tags.Format<"date-time">) | null = todo.start_date;
    const originalDueDate: (string & tags.Format<"date-time">) | null = todo.due_date;
    const originalIsCompleted: boolean = todo.is_completed;
    const originalUpdatedAt: string & tags.Format<"date-time"> = todo.updated_at;
    // 4. Soft-delete the todo (move to trash by setting deleted_at)
    await api.functional.todoApp.member.todos.erase(memberConnection, {
        todoId: todo.id,
    });
    // 5. Restore the todo from trash (clear deleted_at to null)
    const restoredTodo: ITodoAppTodo = await api.functional.todoApp.member.todos.restore(memberConnection, {
        todoId: todo.id,
    });
    typia.assert(restoredTodo);
    // 6. Validate restored todo is in active state (deleted_at cleared to null)
    TestValidator.equals("deleted_at is null after restore (todo is active)", restoredTodo.deleted_at, null);
    // 7. Validate all original data is preserved during restoration
    TestValidator.equals("title is preserved after restore", restoredTodo.title, originalTitle);
    TestValidator.equals("description is preserved after restore", restoredTodo.description, originalDescription);
    TestValidator.equals("start_date is preserved after restore", restoredTodo.start_date, originalStartDate);
    TestValidator.equals("due_date is preserved after restore", restoredTodo.due_date, originalDueDate);
    TestValidator.equals("is_completed is preserved after restore", restoredTodo.is_completed, originalIsCompleted);
    // 8. Validate updated_at timestamp is refreshed to reflect restoration time
    TestValidator.predicate("updated_at is refreshed after restore", () => new Date(restoredTodo.updated_at) >= new Date(originalUpdatedAt));
}