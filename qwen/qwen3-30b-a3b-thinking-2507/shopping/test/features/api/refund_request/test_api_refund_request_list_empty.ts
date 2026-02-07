import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_refund_request_list_empty(connection: api.IConnection): Promise<void> {
    // 1. Admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
        },
    });

    // 2. Generate random order ID
    const orderId = typia.random<string & tags.Format<"uuid">>();

    // 3. Call refund requests endpoint
    const response = await api.functional.ecommerce.admin.orders.refund_requests.index(adminConnection, {
        orderId,
        body: {},
    });
    typia.assert(response);

    // 4. Validate empty data and pagination
    TestValidator.equals("data array length", response.data.length, 0);
    TestValidator.equals("pagination records", response.pagination.records, 0);
    TestValidator.equals("pagination pages", response.pagination.pages, 0);
    TestValidator.equals("pagination current", response.pagination.current, 1);
    TestValidator.equals("pagination limit", response.pagination.limit, 12);
}