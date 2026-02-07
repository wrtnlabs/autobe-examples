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
export async function test_api_seller_session_list_excluding_expired(connection: api.IConnection): Promise<void> {
    // 1. Create actor-specific connection for seller
    const sellerConnection: api.IConnection = { host: connection.host };
    // 2. Register the seller account using utility function
    const registeredSeller = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(8),
        } satisfies IEcommerceSeller.IJoin,
    });
    // 3. Retrieve seller session list
    const sessions: IPageIEcommerceSellerSession.ISummary = await api.functional.ecommerce.seller.seller_sessions.index(sellerConnection, {
        body: typia.random<IEcommerceSellerSession.IRequest>(),
    });
    // 4. Verify no expired sessions
    for (const session of sessions.data) {
        TestValidator.predicate("session should not be expired", new Date(session.expired_at) > new Date());
    }
}