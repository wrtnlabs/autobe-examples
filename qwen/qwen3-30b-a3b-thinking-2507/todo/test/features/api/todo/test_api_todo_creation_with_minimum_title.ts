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
export async function test_api_todo_creation_with_minimum_title(connection: api.IConnection) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: typia.random<ITodoUser.IJoin>(),
    });
    const todo = await api.functional.todo.user.todos.create(userConnection, {
        body: {
            title: RandomGenerator.alphabets(1),
        },
    }) satisfies ITodoTodo.ICreate;
    typia.assert(todo);
    TestValidator.equals("due_date should be null (No due date)", todo.due_date, null);
    TestValidator.equals("is_completed should be false", todo.is_completed, false);
    TestValidator.predicate("user reference should be present", todo.user !== undefined);
}