import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_login_success(connection: api.IConnection): Promise<void> {
    // Create seller account with join
    const joinConnection: api.IConnection = { host: connection.host };
    const newSeller = await authorize_seller_join(joinConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "SellerPassword123"
        }
    });
    // Log in with the new seller's credentials
    const loginConnection: api.IConnection = { host: connection.host };
    const loggedInSeller = await authorize_seller_login(loginConnection, {
        body: {
            email: newSeller.email,
            password: "SellerPassword123"
        }
    });
    // Check that the response contains the token
    TestValidator.predicate("must have access token", !!loggedInSeller.token.access);
    TestValidator.predicate("must have refresh token", !!loggedInSeller.token.refresh);
    // Check the approval status
    TestValidator.equals("seller status should be approved", loggedInSeller.approval_status, "approved");
}