import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoHistory";
import type { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { prepare_random_todo_todo } from "../../../prepare/prepare_random_todo_todo";
import { generate_random_todo_user_todos_create } from "../../../generate/generate_random_todo_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_history_retrieval(connection: api.IConnection): Promise<void> {
    const userConnection: api.IConnection = { host: connection.host };
    const user: ITodoUser.IAuthorized = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
        },
    });
    typia.assert(user);
    const initialTodo: ITodoTodo = await api.functional.todo.user.todos.create(userConnection, {
        body: {
            title: "Initial Todo",
            description: "This is the initial todo item",
        },
    });
    typia.assert(initialTodo);
    const updatedTodo: ITodoTodo = await api.functional.todo.user.todos.update(userConnection, {
        todoId: initialTodo.id,
        body: {
            title: "Updated Todo",
        },
    });
    typia.assert(updatedTodo);
    const history: IPageITodoHistory.ISummary = await api.functional.todo.user.todos.histories.index(userConnection, {
        todoId: initialTodo.id,
        body: {
            page: 1,
            size: 10,
            sort_by: "created_at",
            order: "desc",
        },
    });
    typia.assert(history);
    TestValidator.equals("history should contain at least one entry", history.data.length, 2);
    TestValidator.equals("history entry has correct field (update)", history.data[0].field_name, "title");
    TestValidator.equals("history entry has correct previous value (update)", history.data[0].previous_value, "Initial Todo");
    TestValidator.equals("history entry has correct new value (update)", history.data[0].new_value, "Updated Todo");
    TestValidator.equals("history entry has correct field (original)", history.data[1].field_name, "title");
    TestValidator.equals("history entry has correct previous value (original)", history.data[1].previous_value, null);
    TestValidator.equals("history entry has correct new value (original)", history.data[1].new_value, "Initial Todo");
    TestValidator.predicate("history entries are ordered newest-first", () => {
        return history.data[0].created_at > history.data[1].created_at;
    });
}