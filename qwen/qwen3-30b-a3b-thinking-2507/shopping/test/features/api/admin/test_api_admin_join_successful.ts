import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_successful(connection: api.IConnection): Promise<void> {
    const generateValidPassword = (): string => {
        let password = RandomGenerator.alphaNumeric(8);
        if (password === password.toLowerCase()) {
            const index = Math.floor(Math.random() * 8);
            password = password.substring(0, index) + password.charAt(index).toUpperCase() + password.substring(index + 1);
        }
        if (!/\d/.test(password)) {
            const index = Math.floor(Math.random() * 8);
            password = password.substring(0, index) + (Math.floor(Math.random() * 10)).toString() + password.substring(index + 1);
        }
        return password;
    };

    const adminConnection: api.IConnection = { host: connection.host };

    const output: IEcommerceAdmin.IAuthorized = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: generateValidPassword(),
        },
    });

    typia.assert(output);
}