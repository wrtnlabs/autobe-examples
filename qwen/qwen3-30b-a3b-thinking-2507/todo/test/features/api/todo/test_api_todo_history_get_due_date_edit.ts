import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { prepare_random_todo_todo } from "../../../prepare/prepare_random_todo_todo";
import { generate_random_todo_user_todos_create } from "../../../generate/generate_random_todo_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_history_get_due_date_edit(connection: api.IConnection): Promise<void> {
    // 1. User registration
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: typia.random<ITodoUser.IJoin>(),
    });
    
    // 2. Create todo with due date
    const initialDueDate = new Date().toISOString();
    const createdTodo = await generate_random_todo_user_todos_create(userConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            due_date: initialDueDate,
        }
    });
    typia.assert(createdTodo);
    TestValidator.equals("due_date matches initial value", createdTodo.due_date, initialDueDate);
    
    // 3. Create a new todo to simulate an edit
    const newDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const updatedTodo = await generate_random_todo_user_todos_create(userConnection, {
        body: {
            title: createdTodo.title,
            due_date: newDueDate,
        }
    });
    typia.assert(updatedTodo);
    TestValidator.equals("due_date matches new value", updatedTodo.due_date, newDueDate);
    
    // 4. Get history entry for due date edit
    const history = await api.functional.todo.user.todos.histories.at(userConnection, {
        todoId: createdTodo.id,
        historyId: typia.random<string & tags.Format<"uuid">>(),
    });
    typia.assert(history);
    
    // 5. Verify both dates in history
    TestValidator.equals("previous due date matches initial", history.prev_due_date, initialDueDate);
    TestValidator.equals("new due date matches update", history.new_due_date, newDueDate);
}