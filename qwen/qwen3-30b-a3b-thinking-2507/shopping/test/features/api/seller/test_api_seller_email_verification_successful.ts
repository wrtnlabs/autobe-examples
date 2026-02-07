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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_email_verification_successful(connection: api.IConnection) {
    // 1. Register new seller account
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        },
    });
    
    // 2. Use seller's ID as verification ID (valid assumption based on relationship)
    const verificationId = seller.id;
    
    // 3. Get verification record
    const verificationRecord = await api.functional.ecommerce.seller.seller_email_verifications.at(sellerConnection, {
        verificationId,
    });
    typia.assert(verificationRecord);

    // 4. Validate verification record content
    TestValidator.equals("Seller ID in verification should match", verificationRecord.seller.id, seller.id);
    TestValidator.equals("is_verified should be false", verificationRecord.is_verified, false);
    TestValidator.predicate("Token should exist and be non-empty", verificationRecord.token.length > 0);
    TestValidator.predicate("Expires at should be in future", new Date(verificationRecord.expires_at) > new Date());
}