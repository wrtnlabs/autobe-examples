import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_session_owner_access(connection: api.IConnection): Promise<void> {
    const userConnection: api.IConnection = { host: connection.host };
    const registrationResponse = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "securePassword123",
        }
    });
    const sessionId = registrationResponse.id satisfies string & tags.Format<"uuid">;
    const session = await api.functional.todoApp.user.sessions.at(userConnection, {
        sessionId: sessionId,
    });
    typia.assert(session);
}