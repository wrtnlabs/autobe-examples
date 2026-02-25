import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_index_ip_filtering(connection: api.IConnection): Promise<void> {
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(16);

    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: { email, password } satisfies ITodoAppUser.IJoin
    });

    const loginConnection: api.IConnection = { host: connection.host };
    await authorize_user_login(loginConnection, {
        body: { email, password } satisfies ITodoAppUser.ILogin
    });

    const response = await api.functional.todoApp.user.sessions.index(userConnection, {
        body: { ip_pattern: '192.168.*' } satisfies ITodoAppUserSession.IRequest
    });

    typia.assert(response);
    TestValidator.equals('should return exactly 2 matching sessions', response.data.length, 2);
}