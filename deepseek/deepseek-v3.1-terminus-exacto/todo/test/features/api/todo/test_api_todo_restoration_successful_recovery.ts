import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_restoration_successful_recovery(connection: api.IConnection): Promise<void> {
    // Step 1: Create user connection and authenticate
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>()
        } satisfies ITodoAppUser.IJoin,
    });
    typia.assert(user);
    // Step 2: Create a todo
    const todo = await generate_random_todo_app_user_todos_create(userConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    TestValidator.equals("todo created successfully", todo.user.id, user.id);
    TestValidator.predicate("todo is active initially", todo.deleted_at === null);
    // Step 3: Restore the todo (testing restoration functionality)
    const restoredTodo = await api.functional.todoApp.user.todos.restore(userConnection, {
        todoId: todo.id,
    });
    typia.assert(restoredTodo);
    // Step 4: Validate restoration results
    TestValidator.equals("todo ID unchanged", restoredTodo.id, todo.id);
    TestValidator.equals("todo title unchanged", restoredTodo.title, todo.title);
    TestValidator.equals("user ownership maintained", restoredTodo.user.id, user.id);
    TestValidator.predicate("todo is restored (deleted_at is null)", restoredTodo.deleted_at === null);
    // Validate timestamps
    TestValidator.equals("created_at unchanged", restoredTodo.created_at, todo.created_at);
    TestValidator.predicate("updated_at potentially updated", restoredTodo.updated_at >= todo.created_at);
}