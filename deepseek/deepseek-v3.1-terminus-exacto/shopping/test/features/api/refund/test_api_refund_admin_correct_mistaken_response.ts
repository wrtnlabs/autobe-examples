import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_admin_correct_mistaken_response(connection: api.IConnection): Promise<void> {
    // Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceAdministrator.IJoin,
    });

    // Administrator deletes incorrect refund response
    const refundRequestId = typia.random<string & tags.Format<"uuid">>();
    const responseId = typia.random<string & tags.Format<"uuid">>();
    
    await api.functional.ecommerce.administrator.refund_requests.responses.erase(adminConnection, {
        refundRequestId,
        responseId,
    });

    // Validate deletion successful - void function expects no return value
    TestValidator.equals("call should complete without error", undefined, undefined);
}