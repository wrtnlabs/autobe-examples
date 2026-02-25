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
export async function test_api_todo_update_title_description(connection: api.IConnection) {
    // 1. User registration and authorization
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
        }
    });
    
    // 2. Create initial todo
    const initialTodo: ITodoAppTodo = await generate_random_todo_app_user_todos_create(userConnection, {
        body: {
            title: "Test Todo",
            description: "Initial description",
        },
    });

    // 3. Update todo title and description
    const updatedTodo: ITodoAppTodo = await api.functional.todoApp.user.todos.update(userConnection, {
        id: initialTodo.id,
        body: {
            title: "Updated Title",
            description: "Updated description",
            is_complete: false,
        },
    });

    typia.assert(updatedTodo);

    // 4. Validate the update
    TestValidator.equals("title matches", updatedTodo.title, "Updated Title");
    TestValidator.equals("description matches", updatedTodo.description, "Updated description");
    TestValidator.predicate("is_complete remains false", updatedTodo.is_complete === false);
}