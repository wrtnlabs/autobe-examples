import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_session_renewal_success(connection: api.IConnection): Promise<void> {
    // 1. Create customer
    const customerConnection: api.IConnection = { host: connection.host };
    const body1 = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/signup",
        referrer: "https://example.com/register",
        ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin;
    const customer = await authorize_customer_join(customerConnection, { body: body1 });
    
    // 2. Renew session using refresh token
    const renewalConnection: api.IConnection = { host: connection.host };
    const body2 = {
        refresh_token: customer.token.refresh,
    } satisfies IEcommerceCustomer.IRefresh;
    const renewed = await authorize_customer_refresh(renewalConnection, { body: body2 });
    
    // 3. Validate results
    typia.assert(renewed);
    TestValidator.notEquals("access token should be renewed", customer.token.access, renewed.token.access);
    TestValidator.notEquals("refresh token should be renewed", customer.token.refresh, renewed.token.refresh);
    
    // Verify access token expiration time (should be 25-35 minutes)
    const now = new Date();
    const accessTokenExp = new Date(renewed.token.expired_at);
    const accessTokenMinutesLeft = (accessTokenExp.getTime() - now.getTime()) / (1000 * 60);
    TestValidator.predicate("access token should have about 30 minutes left", accessTokenMinutesLeft >= 25 && accessTokenMinutesLeft <= 35);
    
    // Verify refresh token expiration time (should be 6.5-7.5 days)
    const refreshExp = new Date(renewed.token.refreshable_until);
    const daysUntilRefreshExp = (refreshExp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    TestValidator.predicate("refresh token should be valid for approximately 7 days", daysUntilRefreshExp >= 6.5 && daysUntilRefreshExp <= 7.5);
}