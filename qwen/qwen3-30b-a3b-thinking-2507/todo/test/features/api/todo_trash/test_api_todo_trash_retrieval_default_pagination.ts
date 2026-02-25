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

export async function test_api_todo_trash_retrieval_default_pagination(connection: api.IConnection): Promise<void> {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        }
    });
    
    const trashResult = await api.functional.todoApp.user.trash.index(userConnection, {
        body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>,
        }
    });
    
    typia.assert(trashResult);
    TestValidator.equals("trash items should have standard fields", trashResult.data.length > 0 ?
        trashResult.data.every(item => item.title !== undefined &&
            item.is_complete !== undefined &&
            item.start_date !== undefined &&
            item.due_date !== undefined &&
            item.created_at !== undefined) : true, true);
    TestValidator.equals("page should be 1", trashResult.pagination.current, 1);
    TestValidator.equals("limit should be 10", trashResult.pagination.limit, 10);
}