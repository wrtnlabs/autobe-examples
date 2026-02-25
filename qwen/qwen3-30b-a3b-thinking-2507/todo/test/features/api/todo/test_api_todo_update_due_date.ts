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

export async function test_api_todo_update_due_date(connection: api.IConnection): Promise<void> {
    // Authenticate as user
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        },
    });

    // Create initial todo with due date
    const todo = await generate_random_todo_app_user_todos_create(userConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            due_date: typia.random<string & tags.Format<"date-time">>(),
        },
    });

    // Update due_date to future date
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + 7);

    // Update the todo
    const updatedTodo = await api.functional.todoApp.user.todos.update(userConnection, {
        id: todo.id,
        body: {
            due_date: newDueDate.toISOString(),
            is_complete: todo.is_complete,
        },
    });

    typia.assert(updatedTodo);
    // Verify due_date updated
    TestValidator.equals(
        "due_date matches expected",
        updatedTodo.due_date,
        newDueDate.toISOString()
    );
}