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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_session_retrieval(connection: api.IConnection): Promise<void> {
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuthorized = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "testPassword123",
        },
    });
    const session = await api.functional.ecommerce.seller.seller_sessions.at(sellerConnection, {
        sessionId: sellerAuthorized.id,
    });
    typia.assert(session);
    TestValidator.equals("IP address is present", session.ip, "127.0.0.1");
    TestValidator.equals("Request path is present", session.href, `/ecommerce/seller/seller-sessions/${sellerAuthorized.id}`);
    TestValidator.predicate("Session has expired at date in the future", new Date(session.expired_at) > new Date());
}