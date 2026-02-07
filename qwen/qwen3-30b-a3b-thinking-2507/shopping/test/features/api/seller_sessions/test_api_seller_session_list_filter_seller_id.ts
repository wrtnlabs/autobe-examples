import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerSession";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_session_list_filter_seller_id(connection: api.IConnection): Promise<void> {
    // 1. Seller setup
    const sellerConnection: api.IConnection = { host: connection.host };
    const authResponse = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        }
    });
    const sellerId = authResponse.id;
    
    // 2. Request session list with sellerId filter
    const sessionList = await api.functional.ecommerce.seller.seller_sessions.index(sellerConnection, {
        body: {
            sellerId: sellerId,
        }
    });
    
    typia.assert(sessionList);
    
    // 3. Verify results only show sessions for the specified seller
    for (const session of sessionList.data) {
        TestValidator.equals("Seller ID matches", session.seller.id, sellerId);
    }
}