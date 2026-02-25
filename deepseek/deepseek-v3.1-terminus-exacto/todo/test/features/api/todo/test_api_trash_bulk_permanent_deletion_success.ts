import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppPermanentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPermanentDeletion";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_trash_bulk_permanent_deletion_success(connection: api.IConnection): Promise<void> {
    // 1. Create user and connection
    const userConnection: api.IConnection = { host: connection.host };
    
    const user = await api.functional.todoApp.auth.user.join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphabets(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppUser.IJoin,
    });
    typia.assert(user);
    
    // 2. Create multiple todos
    const todos = await ArrayUtil.asyncRepeat(3, async () => {
        const todo = await api.functional.todoApp.user.todos.create(userConnection, {
            body: {
                title: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies ITodoAppTodo.ICreate,
        });
        typia.assert(todo);
        return todo;
    });
    
    // 3. Soft delete todos to move them to trash
    for (const todo of todos) {
        await api.functional.todoApp.user.todos.erase(userConnection, {
            todoId: todo.id,
        });
    }
    
    // 4. Perform bulk permanent deletion
    const deletionResponse = await api.functional.todoApp.user.bulk_permanent_delete.bulkPermanentDelete(userConnection, {
        body: {
            todo_ids: todos.map(todo => todo.id),
        } satisfies ITodoAppPermanentDeletion.IRequest,
    });
    typia.assert(deletionResponse);
    
    // 5. Validate deletion response contains correct audit information
    TestValidator.equals("deletion response todo id matches input", deletionResponse.todo.id, todos[0]!.id);
    TestValidator.equals("deletion response user id matches executor", deletionResponse.user.id, user.id);
    TestValidator.predicate("deletion timestamp is properly set", deletionResponse.deleted_at !== null);
    TestValidator.predicate("deletion reason is null when not provided", deletionResponse.reason === null);
    
    // 6. Validate atomic behavior - response should confirm single todo deletion
    TestValidator.equals("bulk operation returns single audit record", deletionResponse.id, typia.random<string & tags.Format<"uuid">>());
}