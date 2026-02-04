import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_management_filter_by_status(connection: api.IConnection): Promise<void> {
    // Step 1: Authenticate as admin using the utility function
    const adminConnection: api.IConnection = { host: connection.host };
    const adminToken = await authorize_admin_join(adminConnection, {
        body: {
            // IShoppingMallAdmin.IJoin is an empty object
        }
    });

    // Step 2: Filter sellers by 'pending' status
    const response = await api.functional.shoppingMall.admin.sellers.index(adminConnection, {
        body: {
            status: ["pending"],
        }
    });

    typia.assert(response);

    // Step 3: Validate the response
    // Verify we have at least 1 pending seller
    TestValidator.predicate(
        "should have at least one pending seller",
        response.data.length > 0
    );

    // Verify all returned sellers have pending status
    for (const seller of response.data) {
        TestValidator.equals(
            `seller ${seller.id} should be pending`,
            seller.status,
            "pending"
        );
    }
}