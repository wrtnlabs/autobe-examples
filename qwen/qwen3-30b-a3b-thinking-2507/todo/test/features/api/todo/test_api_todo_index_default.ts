import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_index_default(connection: api.IConnection): Promise<void> {
    // 1. Create actor-specific connection for user registration
    const registerConnection: api.IConnection = { host: connection.host };

    // 2. Register new user using utility function
    const user = await authorize_user_join(registerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        },
    });

    // 3. Validate user registration response
    typia.assert(user);

    // 4. Create connection for API calls with authentication
    const apiConnection: api.IConnection = { host: connection.host };
    apiConnection.headers = { Authorization: `Bearer ${user.token.access}` };

    // 5. Call todos index with default parameters
    const todos = await api.functional.todoApp.user.todos.index(apiConnection, {
        body: {
            status: 'all',
            page: 1,
            limit: 10,
            sortBy: 'creationDate',
            order: 'desc',
        },
    });

    // 6. Validate response structure
    typia.assert(todos);

    // 7. Validate pagination parameters
    TestValidator.equals("pagination current", todos.pagination.current, 1);
    TestValidator.equals("pagination limit", todos.pagination.limit, 10);
    TestValidator.predicate("pagination records > 0", todos.pagination.records > 0);
    TestValidator.predicate("pagination pages > 0", todos.pagination.pages > 0);
}