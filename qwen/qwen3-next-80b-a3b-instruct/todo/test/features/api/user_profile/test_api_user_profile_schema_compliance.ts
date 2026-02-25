import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_profile_schema_compliance(connection: api.IConnection): Promise<void> {
    // Create authenticated user via join
    const userConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies ITodoAppUser.IJoin,
    });
    typia.assert(authorized);
    // Retrieve profile using the authorized connection
    const profile = await api.functional.todoApp.user.profile.at(userConnection);
    typia.assert(profile);
    // Validate schema compliance
    TestValidator.equals("profile id is uuid", profile.id, authorized.id);
    TestValidator.predicate("display_name is string", typeof profile.display_name === "string");
    TestValidator.predicate("created_at is ISO date-time", typia.is<string & tags.Format<"date-time">>(profile.created_at));
    TestValidator.predicate("updated_at is ISO date-time", typia.is<string & tags.Format<"date-time">>(profile.updated_at));
    TestValidator.notEquals("created_at and updated_at are different", profile.created_at, profile.updated_at);
}