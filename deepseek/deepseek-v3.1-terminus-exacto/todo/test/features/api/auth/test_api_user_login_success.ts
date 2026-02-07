import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_login_success(connection: api.IConnection): Promise<void> {
    // Step 1: Create user credentials for login test
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(16);
    const display_name = RandomGenerator.name();
    // Step 2: Create separate connection and join user
    const joinConnection: api.IConnection = { host: connection.host };
    const joinData = await authorize_user_join(joinConnection, {
        body: {
            email,
            password,
            display_name,
        } satisfies ITodoAppUser.IJoin,
    });
    typia.assert(joinData);
    // Step 3: Create separate connection for login operation
    const loginConnection: api.IConnection = { host: connection.host };
    const loginData = await api.functional.todoApp.auth.user.login(loginConnection, {
        body: {
            email,
            password,
        } satisfies ITodoAppUser.ILogin,
    });
    typia.assert(loginData);
    // Step 4: Validate user profile consistency
    TestValidator.equals("user IDs should match", loginData.id, joinData.id);
    TestValidator.equals("email should match", loginData.email, joinData.email);
    TestValidator.equals("display name should match", loginData.display_name, joinData.display_name);
    TestValidator.equals("created_at should match", loginData.created_at, joinData.created_at);
    TestValidator.equals("updated_at should match", loginData.updated_at, joinData.updated_at);
    // Step 5: Validate token structure and expiration
    TestValidator.predicate("access token should exist", loginData.token.access.length > 0);
    TestValidator.predicate("refresh token should exist", loginData.token.refresh.length > 0);
    const expiredAt = new Date(loginData.token.expired_at);
    const refreshableUntil = new Date(loginData.token.refreshable_until);
    TestValidator.predicate("expired_at should be valid date", !isNaN(expiredAt.getTime()));
    TestValidator.predicate("refreshable_until should be valid date", !isNaN(refreshableUntil.getTime()));
    TestValidator.predicate("refreshable_until should be after expired_at", refreshableUntil > expiredAt);
}