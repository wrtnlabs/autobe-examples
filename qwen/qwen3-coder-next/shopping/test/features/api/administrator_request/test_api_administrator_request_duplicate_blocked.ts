import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { prepare_random_shopping_mall_admin } from "../../../prepare/prepare_random_shopping_mall_admin";
import { generate_random_shopping_mall_admin_administrators_request_administrator } from "../../../generate/generate_random_shopping_mall_admin_administrators_request_administrator";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_administrator_request_duplicate_blocked(connection: api.IConnection): Promise<void> {
    // 1. Create customer user
    const customerEmail = typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>();
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
        body: {
            email: customerEmail,
            password: "Customer123!",
            display_name: RandomGenerator.name(),
            href: "https://example.com/join",
            referrer: "https://example.com/referrer",
        } satisfies IShoppingMallCustomer.IJoin,
    });
    // 2. First administrator request - should succeed
    const firstRequest = await api.functional.shoppingMall.admin.administrators.requestAdministrator(customerConnection, {
        body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdmin.ICreate,
    });
    typia.assert(firstRequest);
    TestValidator.equals("first request status is pending", firstRequest.status, "pending");
    // 3. Attempt duplicate administrator request - should fail with 409 conflict
    await TestValidator.error("duplicate request blocked", async () => {
        await api.functional.shoppingMall.admin.administrators.requestAdministrator(customerConnection, {
            body: {
                reason: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies IShoppingMallAdmin.ICreate,
        });
    });
}