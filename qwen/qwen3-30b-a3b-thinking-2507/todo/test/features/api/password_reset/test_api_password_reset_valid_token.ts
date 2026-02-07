import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPasswordReset";
import { prepare_random_todo_user_password_reset } from "../../../prepare/prepare_random_todo_user_password_reset";
import { generate_random_todo_user_password_resets_create } from "../../../generate/generate_random_todo_user_password_resets_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_password_reset_valid_token(connection: api.IConnection): Promise<void> {
    // 1. Register user
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
        body: typia.random<ITodoUser.IJoin>(),
    });

    // 2. Create password reset record
    const resetRecord: ITodoUserPasswordReset = await generate_random_todo_user_password_resets_create(userConnection, {
        body: typia.random<ITodoUserPasswordReset.ICreate>(),
    });
    typia.assert(resetRecord);

    // 3. Access password reset details
    const passwordResetDetails: ITodoUserPasswordReset = await api.functional.todo.user.password_resets.at(userConnection, {
        resetId: resetRecord.id,
    });
    typia.assert(passwordResetDetails);

    // 4. Validate
    const currentTime = new Date().toISOString();
    TestValidator.predicate("Not expired", passwordResetDetails.expires_at > currentTime);
    TestValidator.equals("Not used", passwordResetDetails.used_at, null);
}