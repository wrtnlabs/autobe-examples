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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_update_title_and_description(connection: api.IConnection): Promise<void> {
    // Authenticate user
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: typia.random<ITodoUser.IJoin>(),
    });
    
    // Generate new title and description
    const title = RandomGenerator.paragraph({ sentences: 1 });
    const description = RandomGenerator.paragraph({ sentences: 2 });
    
    // Update todo item
    const todoId = typia.random<string & tags.Format<"uuid">>();
    const body = {
        title,
        description,
    };
    
    const updatedTodo = await api.functional.todo.user.todos.update(userConnection, {
        todoId,
        body,
    });
    
    typia.assert(updatedTodo);
    // Verify results
    TestValidator.equals('Title matches', updatedTodo.title, title);
    TestValidator.equals('Description matches', updatedTodo.description, description);
}