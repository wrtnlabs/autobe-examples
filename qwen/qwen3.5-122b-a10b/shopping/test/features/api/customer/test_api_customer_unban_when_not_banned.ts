import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that attempting to unban a customer who is not in 'banned' status
 * returns a 409 conflict error.
 *
 * Workflow:
 * 1. Register an administrator account
 * 2. Register a customer account (which will be in 'active' status by default)
 * 3. Attempt to unban the customer without first banning them
 * 4. Verify the system returns a 409 conflict error indicating the customer
 *    is not in 'banned' status
 *
 * This validates the business rule that unban operations can only be
 * performed on customers with 'banned' account status.
 */
export async function test_api_customer_unban_when_not_banned(connection: api.IConnection): Promise<void> {
    // 1. Register administrator account
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallAdmin.IJoin,
    });
    typia.assert(admin);
    // 2. Register customer account (active status by default)
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            phone_number: null,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: null,
        } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(customer);
    // Verify customer is in active status
    TestValidator.equals("customer account status is active", customer.account_status, "active");
    // 3. Attempt to unban the customer without first banning them
    // 4. Verify the system returns a 409 conflict error
    await TestValidator.httpError("unban non-banned customer returns 409 conflict", 409, async () => {
        await api.functional.ecommerceMall.admin.customers.unban(adminConnection, {
            customerId: customer.id,
        });
    });
}