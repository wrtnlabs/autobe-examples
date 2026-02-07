import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_delete_nonexistent_todo(connection: api.IConnection): Promise<void> {
    // 1. Create actor-specific connections
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: typia.random<ITodoUser.IJoin>(),
    });
    // 2. Attempt to delete non-existent todo
    // Use a random UUID for the todoId - this should not exist in the database
    await TestValidator.httpError("should return 404 for non-existent todo", 404, async () => {
        await api.functional.todo.user.trash.erase(userConnection, {
            todoId: typia.random<string>() as string & tags.Format<"uuid">,
        });
    });
}