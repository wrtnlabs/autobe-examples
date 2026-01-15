import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_seller_order_listing_basic(connection: api.IConnection): Promise<void> {
    // Create seller account
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_member_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IShoppingMallSeller.IJoin
    });
    typia.assert(seller);

    // Authenticate as seller
    const authConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(authConnection, {
        body: {
            email: seller.contactEmail,
        } satisfies IShoppingMallSeller.ILogin
    });
    typia.assert(authConnection);

    // Retrieve seller's orders
    const orders = await api.functional.shoppingMall.seller.orders.index(authConnection, {
        body: {
            page: 1,
            limit: 20,
            status: ["pending", "processing", "completed"],
            created_at_min: "2024-01-01",
            created_at_max: "2024-12-31",
        } satisfies IShoppingMallOrder.IRequest
    });
    typia.assert(orders);
}