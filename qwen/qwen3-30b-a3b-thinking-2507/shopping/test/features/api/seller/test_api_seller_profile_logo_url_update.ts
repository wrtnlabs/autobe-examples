import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_profile_logo_url_update(connection: api.IConnection): Promise<void> {
    // 1. Seller account creation and authentication
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "123456",
        } as IEcommerceSeller.IJoin,
    });
    
    // 2. Seller profile update with valid logo URL
    const logoUrl = "http://example.com/logo.png";
    const updatedProfile = await api.functional.ecommerce.sellers.profile.update(sellerConnection, {
        sellerId: seller.id,
        body: {
            logo_url: logoUrl,
        } as IEcommerceSellerProfile.IUpdate,
    });
    typia.assert(updatedProfile);
    
    // 3. Validation check
    TestValidator.equals("Logo URL should match", updatedProfile.logo_url, logoUrl);
}