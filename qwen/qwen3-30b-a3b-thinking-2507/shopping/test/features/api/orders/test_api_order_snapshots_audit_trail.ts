import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderSnapshot";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_snapshots_audit_trail(connection: api.IConnection): Promise<void> {
    // 1. Admin auth setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
        } satisfies IEcommerceAdmin.IJoin,
    });
    // 2. Get a valid order ID (assuming a valid order exists)
    const orderId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 3. Request snapshots for the order
    const snapshotsResponse: IPageIEcommerceOrderSnapshot.ISummary = await api.functional.ecommerce.admin.orders.snapshots.index(adminConnection, {
        id: orderId,
        body: {
            page: 1,
            limit: 10,
            sort: "created_at:desc",
        } satisfies IEcommerceOrderSnapshot.IRequest,
    });
    typia.assert(snapshotsResponse);
    // 4. Validate response
    TestValidator.predicate("snapshots response should contain data", snapshotsResponse.data.length > 0);
    TestValidator.equals("pagination page matches", snapshotsResponse.pagination.current, 1);
    TestValidator.equals("pagination limit matches", snapshotsResponse.pagination.limit, 10);
    // Verify chronological ordering (newest first)
    if (snapshotsResponse.data.length > 1) {
        for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
            const current = snapshotsResponse.data[i].order.created_at;
            const next = snapshotsResponse.data[i + 1].order.created_at;
            TestValidator.predicate(`order created_at should be chronological: ${current} >= ${next}`, current >= next);
        }
    }
}