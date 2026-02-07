import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerEmailVerification";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_email_verification_retrieval_expiring_tokens(connection: api.IConnection): Promise<void> {
    // 1. Seller sign up
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        },
    });

    // 2. Get verification tokens expiring within next 24 hours
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    
    const result = await api.functional.ecommerce.seller.seller_email_verifications.index(sellerConnection, {
        body: {
            expires_at_min: now.toISOString(),
            expires_at_max: tomorrow.toISOString(),
        },
    });
    typia.assert(result);

    // 3. Verify response - confirm tokens are expiring soon
    TestValidator.predicate("Should contain verification tokens", result.data.length > 0);
    const token = result.data[0];
    const expiry = new Date(token.expires_at);
    TestValidator.predicate("Token expiration within 24 hours", expiry > now && expiry < tomorrow);
    TestValidator.equals("Seller ID matches", token.seller.id, seller.id);
    TestValidator.equals("Verification status", token.is_verified, false);
    TestValidator.equals("Pagination details match", result.pagination.limit, 10);
}