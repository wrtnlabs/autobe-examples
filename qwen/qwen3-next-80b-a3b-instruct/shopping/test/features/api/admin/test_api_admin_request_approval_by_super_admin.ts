import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { prepare_random_shopping_mall_admin_password_reset } from "../../../prepare/prepare_random_shopping_mall_admin_password_reset";
import { generate_random_shopping_mall_customer_admins_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admins_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_approval_by_super_admin(connection: api.IConnection): Promise<void> {
    // Step 1: Create customer account
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.MinLength<8>>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallCustomer.IJoin,
    });
    typia.assert(customer);
    
    // Step 2: Customer submits administrator request
    const request = await generate_random_shopping_mall_customer_admins_requests_create(customerConnection, {
        body: {
            reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallAdminPasswordReset.ICreate,
    });
    typia.assert(request);
    TestValidator.equals("request status is pending", request.status, "pending");
    
    // Step 3: Create super admin account and log in (already authenticated after join)
    const superAdminConnection: api.IConnection = { host: connection.host };
    const superAdmin = await authorize_super_admin_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.MinLength<8>>(),
        } satisfies IShoppingMallSuperAdmin.IJoin,
    });
    typia.assert(superAdmin);
    
    // Step 4: Super admin approves the request (use connection with valid auth)
    await api.functional.shoppingMall.superAdmin.admins.requests.approve(superAdminConnection, {
        adminRequestId: request.adminRequestId
    });
    
    // Approval succeeds without error - 204 No Content is the expected response
}