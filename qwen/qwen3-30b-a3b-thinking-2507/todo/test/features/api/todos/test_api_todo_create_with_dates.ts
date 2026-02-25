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
export async function test_api_todo_create_with_dates(connection: api.IConnection): Promise<void> {
    // 1. Register user
    const authConnection = { host: connection.host };
    const user = await authorize_user_join(authConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(12),
        }
    });
    // 2. Create user-specific connection with token
    const userConnection = {
        host: connection.host,
        headers: { Authorization: `Bearer ${user.token.access}` },
    };
    // 3. Prepare dates
    const today = new Date();
    const startDate = RandomGenerator.date(today, 24 * 60 * 60 * 1000);
    const dueDate = RandomGenerator.date(startDate, 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString();
    const dueDateStr = dueDate.toISOString();
    // 4. Create todo
    const todo = await generate_random_todo_app_user_todos_create(userConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            start_date: startDateStr,
            due_date: dueDateStr,
        }
    });
    typia.assert(todo);
    // 5. Validate
    TestValidator.equals("start_date matches", todo.start_date, startDateStr);
    TestValidator.equals("due_date matches", todo.due_date, dueDateStr);
    TestValidator.equals("status incomplete", todo.is_complete, false);
}