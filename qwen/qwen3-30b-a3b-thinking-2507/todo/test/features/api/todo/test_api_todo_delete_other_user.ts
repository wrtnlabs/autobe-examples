import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { prepare_random_todo_todo } from "../../../prepare/prepare_random_todo_todo";
import { generate_random_todo_user_todos_create } from "../../../generate/generate_random_todo_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_delete_other_user(connection: api.IConnection): Promise<void> {
    // 1. User1 setup - create user1
    const user1Connection: api.IConnection = { host: connection.host };
    await authorize_user_join(user1Connection, {
        body: typia.random<ITodoUser.IJoin>(),
    });
    // 2. Create todo item as user1
    const todo = await api.functional.todo.user.todos.create(user1Connection, {
        body: typia.random<ITodoTodo.ICreate>(),
    });
    typia.assert(todo);
    // 3. User2 setup - create user2
    const user2Connection: api.IConnection = { host: connection.host };
    await authorize_user_join(user2Connection, {
        body: typia.random<ITodoUser.IJoin>(),
    });
    // 4. Attempt to delete todo created by user1 using user2
    await TestValidator.httpError("User2 should not be able to delete user1's todo item", 403, async () => {
        await api.functional.todo.user.trash.erase(user2Connection, {
            todoId: todo.id,
        });
    });
}