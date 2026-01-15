import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderRefund";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_refund_access_control(connection: api.IConnection): Promise<void> {
    // Step 1: Create and authenticate as admin
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string>(),
            name: RandomGenerator.name(),
        },
    });
    typia.assert(admin);
    // Step 2: Create test order code (UUID format)
    const orderCode = typia.random<string & tags.Format<"uuid">>();
    // Step 3: Verify admin can access the refund endpoint
    const adminResponse = await api.functional.shoppingMall.admin.orders.refunds.index(adminConnection, {
        orderCode,
        body: {
            page: 1,
            limit: 20,
        }
    });
    typia.assert(adminResponse);
    // Step 4: Try to use non-admin connection which should fail
    await TestValidator.error("non-admin user cannot access admin refund endpoint", async () => {
        const nonAdminConnection: api.IConnection = { host: connection.host };
        await api.functional.shoppingMall.admin.orders.refunds.index(nonAdminConnection, {
            orderCode,
            body: {
                page: 1,
                limit: 20,
            }
        });
    });
}